import animationTrash from './animations/wired-flat-185-trash-bin-hover-pinch.json';
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react'; // (Se mantiene, añadimos lógica extra abajo)
import SidebarSkeleton from './components/SidebarSkeleton';
import ChatAreaSkeleton from './components/ChatAreaSkeleton';
import LeftToolbarSkeleton from './components/LeftToolbarSkeleton';
import EmojiPicker from './EmojiPicker.jsx';
import imageCompression from 'browser-image-compression';
import Lottie from 'react-lottie';
import './AguacateChat.css';
import MessageRenderer from './MessageRenderer.jsx';
import CenterNoticeBox from './components/CenterNoticeBox.jsx';
import VideoThumbnail, { VideoModal } from './VideoPlayer.jsx';
import AudioPlayer from './AudioPlayer.jsx';
import toast, { Toaster } from 'react-hot-toast';
import StoriesView from './StoriesView';
import StoriesSkeleton from './components/StoriesSkeleton.jsx';
import Sidebar from './Sidebar';
import ProfileModal from './ProfileModal';
import ConfigModal from './ConfigModal';
import PersonalizationModal from './PersonalizationModal';
import { useAuth } from './context/AuthContext.jsx';
import supabase from './services/supabaseClient';
import { createOrGetDirectConversation, fetchUserConversations, insertMessage, fetchMessagesPage, updateTable, uploadAudioToBucket, appendUserToMessageSeen, toggleConversationBlocked, clearChatForUser, fetchLastClearChat } from './services/db';

// 1. Importar los archivos de animación desde la carpeta src/animations
import animationSearch from './animations/wired-flat-19-magnifier-zoom-search-hover-rotation.json';
import animationSmile from './animations/wired-flat-261-emoji-smile-hover-smile.json';
import animationLink from './animations/wired-flat-11-link-unlink-hover-bounce.json';
import animationShare from './animations/wired-flat-751-share-hover-pointing.json'; 
import animationSend from './animations/Paper Plane.json';
import animationPhoto from './animations/wired-lineal-61-camera-hover-flash.json';
import animationVideo from './animations/wired-flat-1037-vlog-camera-hover-pinch.json';
import animationConfig from './animations/system-solid-22-build-hover-build.json';
import animationProfile from './animations/system-regular-8-account-hover-pinch.json';
import animationEditProfile from './animations/wired-flat-35-edit-hover-circle.json';
import animationInfoProfile from './animations/wired-flat-112-book-hover-closed.json';
import animationPhotoProfile from './animations/wired-flat-3099-portrait-photo-hover-pinch.json';
import animationTypingProfile from './animations/Typing.json';
import animationLockProfile from './animations/lock.json';
import bocina from './animations/mute.json';
import pin from './animations/Pin.json';
import callSilent from './animations/Call_silent.json';
import information from './animations/information.json';
import animationMic from './animations/wired-outline-188-microphone-recording-morph-button.json';
import wiredPlusCircle from './animations/wired-outline-49-plus-circle-hover-rotation.json';
import individualIcon from './animations/Individual.json';
import teamIcon from './animations/Team.json';

// Funciones para manejar cookies
const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
};

const setCookie = (name, value, days = 365) => {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
};

const AguacateChat = () => {
    // Estado para animación del icono de Nuevo Grupo
    const [isTeamStopped, setTeamStopped] = useState(true);
    // --- Configuración de Video (Fase 1) ---
    const MAX_VIDEO_MB = 50; // Límite de tamaño aceptado para videos
    const MAX_VIDEO_BYTES = MAX_VIDEO_MB * 1024 * 1024;
    const teamOptions = {
        loop: false,
        autoplay: false,
        animationData: teamIcon,
        rendererSettings: {
            preserveAspectRatio: 'xMidYMid slice'
        }
    };
    // Estado para animación del icono de Nuevo Chat
    const [isIndividualStopped, setIndividualStopped] = useState(true);
    const individualOptions = {
        loop: false,
        autoplay: false,
        animationData: individualIcon,
        rendererSettings: {
            preserveAspectRatio: 'xMidYMid slice'
        }
    };
    // Estado para animación del botón +
    const [isPlusStopped, setPlusStopped] = useState(true);
    const plusOptions = {
        loop: false,
        autoplay: false,
        animationData: wiredPlusCircle,
        rendererSettings: {
            preserveAspectRatio: 'xMidYMid slice'
        }
    };
    // Estado para modo de selección de mensajes a fijar
    const [pinMode, setPinMode] = useState(false);
    const [selectedMessagesToPin, setSelectedMessagesToPin] = useState([]);
    const { user } = useAuth();
    const [isDarkMode, setIsDarkMode] = useState(getCookie('darkMode') === 'true');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    // No seleccionar conversación por defecto al cargar
    const [selectedContact, setSelectedContact] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    // Bandera: usuario actual es creador de la conversación seleccionada
    const [isConversationCreator, setIsConversationCreator] = useState(false);
    const [isConversationAccepted, setIsConversationAccepted] = useState(true); // default true para no bloquear chats antiguos
    const [isAcceptingConv, setIsAcceptingConv] = useState(false);
    const [isRejectingConv, setIsRejectingConv] = useState(false);
    // Estado: conversación bloqueada
    const [isConvBlocked, setIsConvBlocked] = useState(false);
    const [isTogglingBlocked, setIsTogglingBlocked] = useState(false);
    const [blockedBy, setBlockedBy] = useState(null); // id del usuario que bloqueó
    // Paginación de mensajes
    const PAGE_SIZE = 20;
    const [hasMoreOlder, setHasMoreOlder] = useState(false);
    const [oldestCursor, setOldestCursor] = useState(null); // ISO date of oldest loaded message
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [messageInput, setMessageInput] = useState('');
    const [showNewChatMenu, setShowNewChatMenu] = useState(false);
    const [showChatOptionsMenu, setShowChatOptionsMenu] = useState(false);
    const [showConfirmClearChat, setShowConfirmClearChat] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showContactModal, setShowContactModal] = useState(false);
    const [modalType, setModalType] = useState('chat');
    const [selectedGroupContacts, setSelectedGroupContacts] = useState([]);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    // Animación modal de adjuntos
    const [isAttachClosing, setIsAttachClosing] = useState(false);
    const [showSideMenu, setShowSideMenu] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [showPersonalizationModal, setShowPersonalizationModal] = useState(false);
    // Emoji picker
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiButtonRef = useRef(null);
    // Multimedia picker (recientes en sesión)
    // Estructura: { id, type: 'image'|'video', name, size, lastModified, url, addedAt }
    const [recentMedia, setRecentMedia] = useState([]);
    const filePickerRef = useRef(null);
    // Personalización: función central de defaults
    const getDefaultPersonalization = (isDark) => {
        if (isDark) {
            return {
                backgroundType: 'solid',
                backgroundColor: '#121212',
                backgroundImage: '',
                bubbleColors: { sent: '#264152', received: '#2C2C2E' },
                accentColor: '#14B8A6',
                fontSize: 16
            };
        }
        return {
            backgroundType: 'solid',
            backgroundColor: '#F2F2F7',
            backgroundImage: '',
            bubbleColors: { sent: '#34C759', received: '#E5E5EA' },
            accentColor: '#14B8A6',
            fontSize: 16
        };
    };
    
    const loadInitialPersonalization = () => {
        const dark = typeof document !== 'undefined' && document.body.classList.contains('dark-mode');
        const defaults = getDefaultPersonalization(dark);
        try {
            const bgType = getCookie('personal_bgType');
            if (bgType) defaults.backgroundType = bgType;
            const bgColor = getCookie('personal_bgColor');
            if (bgColor) defaults.backgroundColor = decodeURIComponent(bgColor);
            const sent = getCookie('personal_bubbleSent');
            if (sent) defaults.bubbleColors.sent = decodeURIComponent(sent);
            const received = getCookie('personal_bubbleReceived');
            if (received) defaults.bubbleColors.received = decodeURIComponent(received);
            const fs = getCookie('personal_fontSize');
            if (fs && !Number.isNaN(parseInt(fs, 10))) defaults.fontSize = parseInt(fs, 10);
        } catch { /* ignore cookie parsing issues */ }
        return defaults;
    };

    const [personalization, setPersonalization] = useState(loadInitialPersonalization);

    // Persistir personalización en cookies cada vez que cambie (solo campos solicitados)
    useEffect(() => {
        try {
            setCookie('personal_bgType', personalization.backgroundType);
            setCookie('personal_bgColor', encodeURIComponent(personalization.backgroundColor));
            setCookie('personal_bubbleSent', encodeURIComponent(personalization.bubbleColors.sent));
            setCookie('personal_bubbleReceived', encodeURIComponent(personalization.bubbleColors.received));
            setCookie('personal_fontSize', String(personalization.fontSize));
            // Imagen omitida por tamaño potencial
        } catch (e) {
            console.warn('No se pudo escribir cookies de personalización', e);
        }
    }, [personalization]);

    // Observer para cambios posteriores de modo (clase dark-mode en body)
    useEffect(() => {
        if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
        const body = document.body;
        let prevIsDark = body.classList.contains('dark-mode');
        const observer = new MutationObserver(() => {
            const isDark = body.classList.contains('dark-mode');
            if (isDark !== prevIsDark) {
                prevIsDark = isDark;
                const defaults = getDefaultPersonalization(isDark); // reset a defaults al cambiar modo (comportamiento previo)
                setPersonalization(defaults); // cookies se actualizarán vía useEffect de personalización
            }
        });
        observer.observe(body, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);
    const [isTyping, setIsTyping] = useState(false); // Nuevo estado
    const [currentView, setCurrentView] = useState('chats'); // 'chats' o 'stories'
    const [loadingStories, setLoadingStories] = useState(false); // Skeleton al entrar a historias
    const [loadingChatsSidebar, setLoadingChatsSidebar] = useState(false); // Skeleton de barra de chats al volver
    const storiesLoadingTimerRef = useRef(null);
    // Ref para controlar acciones dentro de StoriesView (subir historia desde placeholder)
    const storiesViewRef = useRef(null);
    // Corte de limpieza (message_id) para filtrar mensajes previos
    const afterClearMessageIdRef = useRef(null);
    const [inlineStoryMenu, setInlineStoryMenu] = useState(false); // menú inline en placeholder historias
    // Modal de video
    const [videoModalOpen, setVideoModalOpen] = useState(false);
    const [currentVideoSrc, setCurrentVideoSrc] = useState(null);

    // Cambiar vista y, si se pasa a historias, deseleccionar el chat y cerrar menús relacionados
    const handleViewChange = (view) => {
        setCurrentView(view);
        // Limpiar temporizador previo si existiera
        if (storiesLoadingTimerRef.current) {
            clearTimeout(storiesLoadingTimerRef.current);
            storiesLoadingTimerRef.current = null;
        }
        if (view === 'stories') {
            // Deseleccionar chat activo y limpiar menús contextuales
            setSelectedContact(null);
            setShowChatOptionsMenu(false);
            setShowAttachMenu(false);
            setShowNewChatMenu(false);
            // Mostrar skeleton brevemente al entrar a Historias
            setLoadingStories(true);
            // Mostrar skeleton del área de chat también
            setLoadingChatArea(true);
            storiesLoadingTimerRef.current = setTimeout(() => {
                setLoadingStories(false);
                setLoadingChatArea(false);
                storiesLoadingTimerRef.current = null;
            }, 600); // Duración mínima del placeholder
        } else {
            // Volvemos a CHATS: mostrar skeleton en barra de chats y área principal
            setLoadingStories(false);
            setLoadingChatsSidebar(true);
            setLoadingChatArea(true);
            storiesLoadingTimerRef.current = setTimeout(() => {
                setLoadingChatsSidebar(false);
                setLoadingChatArea(false);
                storiesLoadingTimerRef.current = null;
            }, 600);
        }
    };

    // Limpiar temporizador en desmontaje
    useEffect(() => {
        return () => {
            if (storiesLoadingTimerRef.current) clearTimeout(storiesLoadingTimerRef.current);
        };
    }, []);

    // Grabación de audio (MediaRecorder)
    const [isRecording, setIsRecording] = useState(false);
    const [isRecordingPaused, setIsRecordingPaused] = useState(false);
    const [recordingElapsed, setRecordingElapsed] = useState(0); // seconds
    const MAX_RECORD_SECS = 120; // 2 minutes limit
    const MIN_RECORD_SECS = 1; // 1 seconds limit
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioStreamRef = useRef(null);
    const recordingStartRef = useRef(0);
    const accumulatedElapsedRef = useRef(0); // seconds
    const recordingIntervalRef = useRef(null);
    const discardOnStopRef = useRef(false);
    const limitReachedRef = useRef(false);
    const effectiveDurationRef = useRef(0); // duración efectiva al detener
    // MIME elegido para la grabación (preferir OGG/Opus si es posible)
    const recorderMimeRef = useRef('');
    const fmtErr = (err) => {
        try {
            if (!err) return '';
            if (typeof err === 'string') return err;
            if (err.message) return err.message;
            if (err.error_description) return err.error_description;
            if (err.error) return String(err.error);
            return JSON.stringify(err);
        } catch {
            return '';
        }
    };

    // Estados para la vista previa de foto
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [showPhotoPreviewModal, setShowPhotoPreviewModal] = useState(false);
    const [isPhotoModalClosing, setIsPhotoModalClosing] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    // Modal de zoom de imagen en chat
    const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
    const [isImageModalClosing, setIsImageModalClosing] = useState(false);
    const [isImageModalEntering, setIsImageModalEntering] = useState(false);
    const closeImagePreview = () => {
        setIsImageModalClosing(true);
        setTimeout(() => {
            setImagePreviewUrl(null);
            setIsImageModalClosing(false);
        }, 300);
    };

    // Track window focus
    const [isWindowFocused, setIsWindowFocused] = useState(() => (typeof document !== 'undefined' ? document.hasFocus() : true));
    useEffect(() => {
        const onFocus = () => setIsWindowFocused(true);
        const onBlur = () => setIsWindowFocused(false);
        window.addEventListener('focus', onFocus);
        window.addEventListener('blur', onBlur);
        return () => {
            window.removeEventListener('focus', onFocus);
            window.removeEventListener('blur', onBlur);
        }
    }, []);

    // Estado de búsqueda en "Nuevo Chat" (modal)
    const [searchUserQuery, setSearchUserQuery] = useState('');
    const [searchUserResults, setSearchUserResults] = useState([]);
    const [isSearchingUsers, setIsSearchingUsers] = useState(false);
    const searchReqIdRef = useRef(0);
    
    // 2. Estados para controlar las animaciones al pasar el cursor
    const [isMutePaused, setMutePaused] = useState(true);
    const [isMuteStopped, setMuteStopped] = useState(false);
    const [isSearchPaused, setSearchPaused] = useState(true);
    const [isSearchStopped, setSearchStopped] = useState(false);

    const [isLinkPaused, setLinkPaused] = useState(true);
    const [isLinkStopped, setLinkStopped] = useState(false);

    const [isSmilePaused, setSmilePaused] = useState(true);
    const [isSmileStopped, setSmileStopped] = useState(false);

    const [isTrashPaused, setTrashPaused] = useState(true);
    const [isTrashStopped, setTrashStopped] = useState(false);

    const [isSharePaused, setSharePaused] = useState(true);
    const [isShareStopped, setShareStopped] = useState(false);

    const [isSendPaused, setSendPaused] = useState(true);
    const [isSendStopped, setSendStopped] = useState(false);

    // Estados para animación del micrófono (botón de audio)
    const [isMicPaused, setMicPaused] = useState(true);
    const [isMicStopped, setMicStopped] = useState(false);
    // Control de animación del micrófono: se reproduce sólo cuando isRecording es true
    useEffect(() => {
        if (isRecording) {
            // Reiniciar y reproducir una vez desde el inicio
            setMicStopped(true); // forzar reinicio al primer frame
            // pequeño timeout para que Lottie detecte el cambio de isStopped
            setTimeout(() => {
                setMicStopped(false);
                setMicPaused(false); // reproducir
            }, 0);
        } else {
            // Al terminar la grabación volvemos al inicio y pausamos
            setMicPaused(true);
            setMicStopped(true);
        }
    }, [isRecording]);

    const [isPhotoPaused, setPhotoPaused] = useState(true);
    const [isPhotoStopped, setPhotoStopped] = useState(false);

    const [isVideoPaused, setVideoPaused] = useState(true);
    const [isVideoStopped, setVideoStopped] = useState(false);

    const [isProfilePaused, setProfilePaused] = useState(true);
    const [isProfileStopped, setProfileStopped] = useState(false);

    // Estados para animación del pin
    const [isPinPaused, setPinPaused] = useState(true);
    const [isPinStopped, setPinStopped] = useState(false);

    const [isConfigPaused, setConfigPaused] = useState(true);
    const [isConfigStopped, setConfigStopped] = useState(false);

    // Estados para animación de callSilent
    const [isCallSilentPaused, setCallSilentPaused] = useState(true);
    const [isCallSilentStopped, setCallSilentStopped] = useState(false);

    // Estados para animación de information
    const [isInformationPaused, setInformationPaused] = useState(true);
    const [isInformationStopped, setInformationStopped] = useState(false);

    // Lista real de conversaciones del usuario
    const [conversations, setConversations] = useState([]);
    // Estado para plegar/desplegar sección de solicitudes entrantes
    const [showChatRequests, setShowChatRequests] = useState(false);
    const [loadingConversations, setLoadingConversations] = useState(true);
    // Control de salida suave del skeleton (fade-out antes de desmontar)
    const [showLoadingSkeleton, setShowLoadingSkeleton] = useState(true);
    const [skeletonExiting, setSkeletonExiting] = useState(false);
    // Skeleton específico del área de chat al cambiar de conversación
    const [loadingChatArea, setLoadingChatArea] = useState(false);
    const [showChatSkeleton, setShowChatSkeleton] = useState(false);
    const [chatSkeletonExiting, setChatSkeletonExiting] = useState(false);
    // Cache de duraciones para previsualización de audios (por id de mensaje)
    const [audioPreviewDurations, setAudioPreviewDurations] = useState({});

    // Derivar contactos a partir de conversaciones (directas) y perfiles
    const conversationsToContacts = (convs) => {
        const deriveInitials = (value) => {
            const parts = (value || '').trim().split(/\s+/);
            const first = parts[0]?.[0] || 'U';
            const second = parts[1]?.[0] || parts[0]?.[1] || '';
            return (first + second).toUpperCase();
        };
        const formatTime = (iso) => {
            if (!iso) return '';
            const d = new Date(iso);
            if (Number.isNaN(d.getTime())) return '';
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        };
        const formatLastConex = (iso) => {
            if (!iso) return 'Desconectado';
            const d = new Date(iso);
            if (Number.isNaN(d.getTime())) return 'Desconectado';
            return `Última conexión a las ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`;
        };
        return (convs || []).map((c) => {
            const username = c?.otherProfile?.username || 'Usuario';
            const name = username.trim();
            const lastType = c?.last_message?.type || 'text';
            const lastContentRaw = c?.last_message?.content || '';
            const lastContent = lastType === 'image' ? 'Foto' : lastContentRaw;
            const lastAt = c?.last_message_at || c?.created_at;
            // Derivados del último mensaje
            const lastId = c?.last_message?.id ?? null;
            const lastAudioUrl = lastType === 'audio' ? c?.last_message?.content : undefined;
            // console.log('Contact', name, 'isOnline:', c?.otherProfile?.isOnline, 'status:', c?.otherProfile?.isOnline ? '🟢' : formatLastConex(c?.otherProfile?.lastConex));
            return {
                name,
                status: c?.otherProfile?.isOnline ? '🟢' : formatLastConex(c?.otherProfile?.lastConex),
                lastMessage: lastContent,
                lastMessageType: lastType,
                lastMessageId: lastId,
                lastAudioUrl,
                time: formatTime(lastAt),
                initials: deriveInitials(name),
                profileId: c?.otherProfile?.id,
                username: c?.otherProfile?.username,
                avatar_url: c?.otherProfile?.avatar_url,
                conversationId: c?.conversationId,
                last_message_at: lastAt,
                lastConex: c?.otherProfile?.lastConex,
                last_message: c?.last_message ? { ...c.last_message, type: lastType } : null,
            };
        });
    };

    // 3. Opciones por defecto para cada animación
    const createLottieOptions = (animationData) => ({
        loop: false,
        autoplay: false,
        animationData: animationData,
        rendererSettings: {
            preserveAspectRatio: 'xMidYMid slice'
        }
    });

    const createLottieOptionsLoop = (animationData) => ({
        loop: true,
        autoplay: true,
        animationData,
        rendererSettings: { preserveAspectRatio: 'xMidYMid slice' },
    });

    const lottieOptions = {
        trash: createLottieOptions(animationTrash),
        search: createLottieOptions(animationSearch),
        link: createLottieOptions(animationLink),
        smile: createLottieOptions(animationSmile),
        share: createLottieOptions(animationShare),
        send: createLottieOptions(animationSend),
        photo: createLottieOptions(animationPhoto),
        video: createLottieOptions(animationVideo),
        profile: createLottieOptions(animationProfile),
        config: createLottieOptions(animationConfig),
        editProfile: createLottieOptions(animationEditProfile),
        infoProfile: createLottieOptions(animationInfoProfile),
        photoProfile: createLottieOptions(animationPhotoProfile),
        typingProfile: createLottieOptions(animationTypingProfile),
        lockProfile: createLottieOptions(animationLockProfile),
        mute: createLottieOptions(bocina),
        pin: createLottieOptions(pin),
        callSilent: createLottieOptions(callSilent),
        information: createLottieOptions(information),
        mic: createLottieOptions(animationMic),
        micRecording: createLottieOptionsLoop(animationMic),
    };

    const clearRecordingTimer = () => {
        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
        }
    };

    const startRecordingTimer = () => {
        clearRecordingTimer();
        recordingIntervalRef.current = setInterval(() => {
            const now = Date.now();
            const current = (now - recordingStartRef.current) / 1000;
            const total = accumulatedElapsedRef.current + current;
            setRecordingElapsed(Math.floor(total));
            if (!isRecordingPaused && total >= MAX_RECORD_SECS) {
                limitReachedRef.current = true;
                accumulatedElapsedRef.current = MAX_RECORD_SECS;
                setRecordingElapsed(MAX_RECORD_SECS);
                try { pauseRecording(); } catch {}
                toast('Has alcanzado el límite de 2:00', { icon: '⏸️' });
            }
        }, 250);
    };

    const formatSeconds = (total) => {
        const s = Math.max(0, Math.floor(total || 0));
        const m = Math.floor(s / 60);
        const ss = s % 60;
        return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    };

    // Elegir el mejor MIME soportado por el navegador para MediaRecorder
    const chooseRecorderMime = () => {
        try {
            if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return '';
            const candidates = [
                'audio/ogg;codecs=opus',
                'audio/ogg',
                'audio/webm;codecs=opus',
                'audio/webm',
            ];
            for (const t of candidates) {
                if (MediaRecorder.isTypeSupported(t)) return t;
            }
            return '';
        } catch {
            return '';
        }
    };

    // Comenzar grabación de audio
    const startRecording = async () => {
        if (!selectedContact) return;
        if (isRecording) return;
        try {
            // Reset limit when starting a fresh recording
            limitReachedRef.current = false;
            // Solicitar acceso al micrófono
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioStreamRef.current = stream;

            // Elegir MIME preferido (OGG/Opus si está disponible)
            const preferredMime = chooseRecorderMime();
            recorderMimeRef.current = preferredMime || '';

            let mr;
            try {
                if (preferredMime) {
                    mr = new MediaRecorder(stream, { mimeType: preferredMime, audioBitsPerSecond: 96000 });
                } else {
                    mr = new MediaRecorder(stream);
                }
            } catch (err) {
                // Fallback: intentar sin opciones
                console.warn('Fallo al crear MediaRecorder con MIME preferido, probando sin opciones:', err);
                mr = new MediaRecorder(stream);
            }

            mediaRecorderRef.current = mr;
            audioChunksRef.current = [];

            mr.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };
            mr.onstop = async () => {
                clearRecordingTimer();
                try {
                    // Si no es cancelación explícita, validar duración mínima
                    if (!discardOnStopRef.current) {
                        const secs = Math.floor(effectiveDurationRef.current || 0);
                        if (secs < MIN_RECORD_SECS) {
                            toast.error(`Audio demasiado corto (mín. ${MIN_RECORD_SECS}s)`);
                            return; // no enviar ni agregar optimista
                        }
                    }
                    if (!discardOnStopRef.current) {
                        // Usar el tipo real del recorder si está disponible
                        const usedType = (mediaRecorderRef.current && mediaRecorderRef.current.mimeType) || recorderMimeRef.current || 'audio/webm';
                        const blob = new Blob(audioChunksRef.current, { type: usedType });
                        const localUrl = URL.createObjectURL(blob);
                        // Optimista: mostrar audio local en el chat mientras sube
                        setChatMessages((prev) => [
                            ...prev,
                            { type: 'sent', audioUrl: localUrl, text: '(Audio)', created_at: new Date().toISOString() },
                        ]);

                        if (!selectedContact?.conversationId) {
                            toast.error('No hay conversación activa para subir el audio');
                        } else {
                            try {
                                const { publicUrl } = await uploadAudioToBucket({
                                    blob,
                                    conversationId: selectedContact.conversationId,
                                    userId: user?.id,
                                    mimeType: usedType,
                                });
                                await insertMessage({
                                    conversationId: selectedContact.conversationId,
                                    senderId: user?.id,
                                    content: publicUrl,
                                    type: 'audio',
                                });
                                toast.success(`Audio enviado`);
                            } catch (e) {
                                console.error('Error al enviar audio:', e);
                                toast.error('No se pudo enviar el audio');
                            }
                        }
                    } else {
                        toast('Grabación cancelada', { icon: '🗑️' });
                    }
                } catch (err) {
                    console.error(err);
                    toast.error('No se pudo procesar el audio');
                } finally {
                    discardOnStopRef.current = false;
                    effectiveDurationRef.current = 0;
                    recorderMimeRef.current = '';
                    accumulatedElapsedRef.current = 0;
                    setRecordingElapsed(0);
                    setIsRecordingPaused(false);
                    // Liberar el micrófono
                    if (audioStreamRef.current) {
                        audioStreamRef.current.getTracks().forEach((t) => t.stop());
                        audioStreamRef.current = null;
                    }
                }
            };

            mr.start();
            setIsRecordingPaused(false);
            accumulatedElapsedRef.current = 0;
            recordingStartRef.current = Date.now();
            setRecordingElapsed(0);
            startRecordingTimer();
            setIsRecording(true);
            toast('Grabando audio... pulsa de nuevo para detener', { icon: '🎙️' });
        } catch (err) {
            console.error('getUserMedia error', err);
            if (err?.name === 'NotAllowedError') {
                toast.error('Permiso de micrófono denegado');
            } else if (err?.name === 'NotFoundError') {
                toast.error('No se encontró un micrófono');
            } else if (typeof MediaRecorder === 'undefined') {
                toast.error('MediaRecorder no está soportado en este navegador');
            } else {
                toast.error('Error al iniciar la grabación');
            }
        }
    };

    // Detener grabación de audio
    const stopRecording = () => {
        if (!isRecording) return;
        try {
            const mr = mediaRecorderRef.current;
            if (mr && mr.state !== 'inactive') {
                // Calcular duración efectiva antes de detener para validar mínimo
                let extra = 0;
                try {
                    if (mr.state === 'recording' && recordingStartRef.current) {
                        extra = (Date.now() - recordingStartRef.current) / 1000;
                    }
                } catch {}
                effectiveDurationRef.current = (accumulatedElapsedRef.current || 0) + extra;
                mr.stop();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsRecording(false);
            clearRecordingTimer();
            setIsRecordingPaused(false);
        }
    };

    const toggleRecording = () => {
        if (isRecording) stopRecording(); else startRecording();
    };

    const cancelRecording = () => {
        if (!isRecording) return;
        discardOnStopRef.current = true;
        stopRecording();
    };

    const pauseRecording = () => {
        try {
            const mr = mediaRecorderRef.current;
            if (mr && mr.state === 'recording' && typeof mr.pause === 'function') {
                mr.pause();
                // acumular el tiempo hasta ahora
                accumulatedElapsedRef.current += (Date.now() - recordingStartRef.current) / 1000;
                clearRecordingTimer();
                setIsRecordingPaused(true);
                toast('Grabación en pausa', { icon: '⏸️' });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const resumeRecording = () => {
        try {
            if (limitReachedRef.current) {
                toast.error('Límite de 2 minutos alcanzado');
                return;
            }
            const mr = mediaRecorderRef.current;
            if (mr && mr.state === 'paused' && typeof mr.resume === 'function') {
                mr.resume();
                recordingStartRef.current = Date.now();
                setIsRecordingPaused(false);
                startRecordingTimer();
                toast('Reanudando grabación', { icon: '▶️' });
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            try {
                clearRecordingTimer();
                if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                    mediaRecorderRef.current.stop();
                }
            } catch {}
            if (audioStreamRef.current) {
                audioStreamRef.current.getTracks().forEach((t) => t.stop());
                audioStreamRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        document.body.className = isDarkMode ? 'dark-mode theme-bg-primary theme-text-primary transition-colors duration-300' : 'light-mode theme-bg-primary theme-text-primary transition-colors duration-300';
    }, [isDarkMode]);

    useEffect(() => {
        setCookie('darkMode', isDarkMode.toString());
    }, [isDarkMode]);

    // Evitar scroll visible: asegurar que el último mensaje sea visible sin animación
    // Se usa useLayoutEffect para posicionar el scroll antes del pintado
    const chatAreaRef = useRef(null);
    const pendingPrependRef = useRef(false);
    const prevScrollHeightRef = useRef(0);
    const prevScrollTopRef = useRef(0);
    const shouldScrollToBottomRef = useRef(false);
    const stickToBottomRef = useRef(true);
    const chatMessagesRef = useRef([]);

    useLayoutEffect(() => {
        if (!selectedContact) return; // sin chat seleccionado, no movemos scroll
        const el = chatAreaRef.current;
        if (!el) return;
        if (pendingPrependRef.current) {
            const prevHeight = prevScrollHeightRef.current || 0;
            const prevTop = prevScrollTopRef.current || 0;
            const delta = el.scrollHeight - prevHeight;
            el.scrollTop = delta + prevTop;
            pendingPrependRef.current = false;
            prevScrollHeightRef.current = 0;
            prevScrollTopRef.current = 0;
        } else if (shouldScrollToBottomRef.current || stickToBottomRef.current) {
            el.scrollTop = el.scrollHeight;
            shouldScrollToBottomRef.current = false;
        }
    }, [chatMessages, selectedContact]);

    // Mantener ref de mensajes para accesos en timers
    useEffect(() => { chatMessagesRef.current = chatMessages; }, [chatMessages]);

    // Mantener referencia de la conversación seleccionada para Realtime global
    const selectedConvIdRef = useRef(null);
    const photoInputRef = useRef(null);

    useEffect(() => {
        selectedConvIdRef.current = selectedContact?.conversationId || null;
        console.log('Selected conversation id set to:', selectedConvIdRef.current);
    }, [selectedContact?.conversationId]);

    // Realtime global: escuchar eventos de messages para
    // a) actualizar chat activo
    // b) refrescar lista de conversaciones con último mensaje y re-orden
    useEffect(() => {
        console.log('Setting up realtime for user:', user?.id);
        const channel = supabase
            .channel('messages:all')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'messages' },
                (payload) => {
                    console.log('Realtime event received');
                    const evt = payload.eventType;
                    if (evt === 'INSERT') {
                        const m = payload.new;
                        if (!m) return;
                        console.log('Event conversation:', m.conversation_id, 'selected:', selectedConvIdRef.current);
                        // b) Actualizar conversaciones y reordenar (para cualquier conversación)
                        setConversations((prev) => {
                            if (!Array.isArray(prev) || prev.length === 0) return prev;
                            const updated = prev.map((c) => {
                                if (c.conversationId === m.conversation_id) {
                                    const t = m.type || 'text';
                                    let label = m.content;
                                    if (t === 'image') label = 'Foto';
                                    else if (t === 'audio') label = 'Audio';
                                    else if (t === 'video') label = 'Video';
                                    return {
                                        ...c,
                                        last_message: { id: m.id, content: m.content, sender_id: m.sender_id, type: t },
                                        last_message_at: m.created_at,
                                        lastMessage: label,
                                        lastMessageType: t,
                                    };
                                }
                                return c;
                            });
                            // Ordenar por más reciente
                            updated.sort((a, b) => {
                                const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
                                const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
                                return tb - ta;
                            });
                            return [...updated];
                        });

                        // a) Actualizar chat activo si coincide
                        if (m.conversation_id !== selectedConvIdRef.current) return;
                        // Evitar duplicar los propios (ya agregados de forma optimista)
                        if (m.sender_id === user?.id) return;
                        setChatMessages((prev) => [
                            ...prev,
                            m.type === 'audio'
                                ? { id: m.id, type: 'received', audioUrl: m.content, text: '(Audio)', created_at: m.created_at, messageType: 'audio', seen: Array.isArray(m.seen) ? m.seen : [] }
                                : { id: m.id, type: 'received', text: m.content, created_at: m.created_at, messageType: m.type || 'text', seen: Array.isArray(m.seen) ? m.seen : [] },
                        ]);
                    } else if (evt === 'UPDATE') {
                        const m = payload.new;
                        if (!m) return;
                        if (m.conversation_id !== selectedConvIdRef.current) return;

                        const applyUpdate = (row) => {
                            setChatMessages((prev) => prev.map((msg) => {
                                if (msg.id !== row.id) return msg;
                                const next = { ...msg };
                                // messageType si viene en la fila
                                if (typeof row.type === 'string') {
                                    next.messageType = row.type || 'text';
                                }
                                // contenido (si viene). Mantener el anterior si no llega.
                                const effectiveType = (typeof row.type === 'string' ? row.type : msg.messageType) || 'text';
                                if (row.content != null) {
                                    if (effectiveType === 'audio') {
                                        next.audioUrl = row.content;
                                        next.text = '(Audio)';
                                    } else {
                                        next.text = row.content;
                                        if (next.audioUrl && effectiveType !== 'audio') delete next.audioUrl;
                                    }
                                }
                                if (row.created_at) next.created_at = row.created_at;
                                if (Array.isArray(row.seen)) next.seen = row.seen;
                                return next;
                            }));
                        };

                        // Si por alguna razón el payload no trae 'seen' (o viene indefinido), hacemos un fetch puntual
                        if (typeof m.seen === 'undefined' || m.seen === null) {
                            supabase
                                .from('messages')
                                .select('id, content, type, created_at, seen, conversation_id')
                                .eq('id', m.id)
                                .single()
                                .then(({ data, error }) => {
                                    if (error || !data) return;
                                    if (data.conversation_id !== selectedConvIdRef.current) return;
                                    applyUpdate(data);
                                })
                                .catch(() => {});
                        } else {
                            applyUpdate(m);
                        }
                    } else if (evt === 'DELETE') {
                        const m = payload.old;
                        if (!m) return;
                        if (m.conversation_id !== selectedConvIdRef.current) return;
                        setChatMessages((prev) => prev.filter(msg => msg.id !== m.id));
                    }
                }
            )
            .subscribe((status) => {
                console.log('Realtime subscription status:', status);
            });

        return () => {
            try { supabase.removeChannel(channel); } catch {}
        };
    }, [user?.id]);

    // Realtime para updates en profiles (isOnline)
    useEffect(() => {
        if (!user?.id) return;

        const profileChannel = supabase
            .channel('profiles_updates')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'profiles' },
                (payload) => {
                    // console.log('Profile realtime event:', payload);
                    const updatedProfile = payload.new;
                    if (!updatedProfile) return;
                    // console.log('Updating profile:', updatedProfile.id, 'isOnline:', updatedProfile.isOnline);
                    // Actualizar el perfil en las conversaciones
                    setConversations((prev) => prev.map((c) => {
                        if (c.otherProfile?.id === updatedProfile.id) {
                            // console.log('Found matching conversation for user:', updatedProfile.id);
                            return {
                                ...c,
                                otherProfile: { ...c.otherProfile, isOnline: updatedProfile.isOnline, lastConex: updatedProfile.lastConex },
                            };
                        }
                        return c;
                    }));
                }
            )
            .subscribe((status) => {
                // console.log('Profiles realtime subscription status:', status);
            });

        return () => {
            try { supabase.removeChannel(profileChannel); } catch {}
        };
    }, [user?.id]);

    // Update selectedContact when conversations change
    useEffect(() => {
        if (selectedContact?.conversationId) {
            const updatedConv = conversations.find(c => c.conversationId === selectedContact.conversationId);
            if (updatedConv) {
                const newContact = conversationsToContacts([updatedConv])[0];
                setSelectedContact(newContact);
            }
        }
    }, [conversations]);

    // Calcular duración de audios para previsualización (último mensaje por conversación)
    useEffect(() => {
        const pending = [];
        for (const conv of conversations || []) {
            const m = conv?.last_message;
            if (m && m.type === 'audio' && m.id && m.content && audioPreviewDurations[m.id] == null) {
                pending.push({ id: m.id, url: m.content });
            }
        }
        if (pending.length === 0) return;
        let cancelled = false;
        pending.forEach(({ id, url }) => {
            try {
                const audio = new Audio();
                const onMeta = () => {
                    if (cancelled) return;
                    const secs = Math.max(0, Math.round(audio.duration || 0));
                    setAudioPreviewDurations(prev => ({ ...prev, [id]: secs }));
                    cleanup();
                };
                const onError = () => {
                    cleanup();
                };
                const cleanup = () => {
                    audio.removeEventListener('loadedmetadata', onMeta);
                    audio.removeEventListener('error', onError);
                };
                audio.addEventListener('loadedmetadata', onMeta);
                audio.addEventListener('error', onError);
                audio.preload = 'metadata';
                audio.src = url;
            } catch {}
        });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversations]);

    // Suscripción realtime para nuevas conversaciones
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase.channel('new_conversations')
        channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'participants', filter: `user_id=eq.${user.id}` }, async (payload) => {
            console.log('Nueva conversación detectada:', payload);
            // Recargar conversaciones
            try {
                const convs = await fetchUserConversations(user.id);
                setConversations(convs);
            } catch (e) {
                console.error('Error recargando conversaciones:', e);
            }
        })
        channel.subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    // Update online status based on tab visibility and window focus
    useEffect(() => {
        if (!user?.id) return;

        const updateOnlineStatus = async () => {
            const shouldBeOnline = !document.hidden && document.hasFocus();
            console.log('Updating my online status to:', shouldBeOnline);
            try {
                const updateData = { isOnline: shouldBeOnline };
                if (!shouldBeOnline) {
                    updateData.lastConex = new Date().toISOString();
                }
                await updateTable('profiles', { id: user.id }, updateData);
            } catch (error) {
                console.error('Error updating online status:', error);
            }
        };

        const handleVisibilityChange = () => {
            console.log('Visibility change detected, hidden:', document.hidden);
            updateOnlineStatus();
        };
        const handleFocus = () => {
            console.log('Window focused');
            updateOnlineStatus();
        };
        const handleBlur = () => {
            console.log('Window blurred');
            updateOnlineStatus();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);

        // Set initial status
        updateOnlineStatus();

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('blur', handleBlur);
        };
    }, [user?.id]);

    // Sincronizar selectedContact con las conversaciones actualizadas
    useEffect(() => {
        if (selectedContact && conversations.length > 0) {
            const contacts = conversationsToContacts(conversations);
            const updatedContact = contacts.find(c => c.conversationId === selectedContact.conversationId);
            if (updatedContact && (updatedContact.status !== selectedContact.status || updatedContact.lastConex !== selectedContact.lastConex)) {
                setSelectedContact(updatedContact);
            }
        }
    }, [conversations, selectedContact?.conversationId]);

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const selectContact = async (contact) => {
        // Mostrar skeleton de chat durante el cambio de conversación
        setLoadingChatArea(true);
        setShowChatSkeleton(true);
        setChatSkeletonExiting(false);
        setSelectedContact(contact);
        // Reset bandera creador hasta confirmar
        setIsConversationCreator(false);
        setIsConvBlocked(false);
        // Reset paginación
        setChatMessages([]);
        setHasMoreOlder(false);
        setOldestCursor(null);
        setLoadingOlder(false);
        shouldScrollToBottomRef.current = true; // al abrir chat, ir al final
        // Reset de buffer de vistos al cambiar de conversación
        try { seenBufferRef.current.clear(); } catch {}
        // Cargar última página si hay conversationId
        try {
            if (contact?.conversationId) {
                // Consultar metadata incluyendo estado bloqueado
                try {
                    const { data: convMeta, error: convMetaErr } = await supabase
                        .from('conversations')
                        .select('id, created_by, blocked, blocked_by, acepted')
                        .eq('id', contact.conversationId)
                        .single();
                    if (!convMetaErr && convMeta) {
                        setIsConversationCreator(convMeta.created_by === user?.id);
                        setIsConversationAccepted(Boolean(convMeta.acepted));
                        const blocked = !!convMeta.blocked;
                        setIsConvBlocked(blocked);
                        setBlockedBy(blocked ? convMeta.blocked_by : null);
                        if (blocked) {
                            // Si está bloqueada, no cargamos mensajes
                            setChatMessages([]);
                            setHasMoreOlder(false);
                            setOldestCursor(null);
                            setLoadingChatArea(false);
                            return; // salir temprano
                        }
                    }
                } catch (metaErr) {
                    console.warn('No se pudo obtener metadata de la conversación:', metaErr);
                }
                try {
                    // Obtener corte de limpieza (si existe) para este usuario
                    let afterMessageId = null;
                    let afterTimestamp = null;
                    try {
                        const clearRow = await fetchLastClearChat(contact.conversationId, user?.id);
                        afterMessageId = clearRow?.message_id || null;
                        afterTimestamp = clearRow?.pivot_created_at || null;
                    } catch (clrErr) {
                        console.warn('No se pudo obtener registro de limpieza:', clrErr);
                    }
                    afterClearMessageIdRef.current = afterMessageId; // cachear id (legacy)
                    const { messages, hasMore, nextCursor } = await fetchMessagesPage(contact.conversationId, { limit: PAGE_SIZE, afterMessageId, afterTimestamp });
                    const mapped = messages.map(m => {
                        const base = {
                            id: m.id,
                            type: m.sender_id === user?.id ? 'sent' : 'received',
                            created_at: m.created_at,
                            messageType: m.type || 'text',
                            seen: Array.isArray(m.seen) ? m.seen : [],
                        };
                        if (m.type === 'audio') return { ...base, audioUrl: m.content, text: '(Audio)' };
                        if (m.type === 'video') return { ...base, text: m.content };
                        if (m.type === 'image') return { ...base, text: m.content };
                        return { ...base, text: m.content };
                    });
                    setChatMessages(mapped);
                    setHasMoreOlder(hasMore);
                    setOldestCursor(nextCursor);
                    // Intentar marcar como visto lo que ya esté en pantalla
                    setTimeout(() => { tryMarkVisibleAsSeen(); }, 0);
                } catch (e2) {
                    console.error('No se pudieron cargar mensajes:', e2);
                } finally {
                    setLoadingChatArea(false);
                }
            }
        } catch (e) {
            console.error('No se pudieron cargar mensajes:', e);
            setChatMessages([]);
            setHasMoreOlder(false);
            setOldestCursor(null);
            setLoadingChatArea(false);
        }
        if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
        }
    };

    const loadOlderMessages = async () => {
        if (!selectedContact?.conversationId || loadingOlder || !hasMoreOlder) return;
        const el = chatAreaRef.current;
    pendingPrependRef.current = true;
    prevScrollHeightRef.current = el ? el.scrollHeight : 0;
    prevScrollTopRef.current = el ? el.scrollTop : 0;
        setLoadingOlder(true);
        try {
            // No usamos afterTimestamp aquí porque ya estamos navegando a mensajes más antiguos que los cargados post-limpieza.
            const { messages, hasMore, nextCursor } = await fetchMessagesPage(selectedContact.conversationId, { limit: PAGE_SIZE, before: oldestCursor, afterMessageId: afterClearMessageIdRef.current });
            const mapped = messages.map(m => {
                const base = {
                    id: m.id,
                    type: m.sender_id === user?.id ? 'sent' : 'received',
                    created_at: m.created_at,
                    messageType: m.type || 'text',
                    seen: Array.isArray(m.seen) ? m.seen : [],
                };
                if (m.type === 'audio') return { ...base, audioUrl: m.content, text: '(Audio)' };
                if (m.type === 'video') return { ...base, text: m.content };
                if (m.type === 'image') return { ...base, text: m.content };
                return { ...base, text: m.content };
            });
            setChatMessages(prev => [...mapped, ...prev]);
            setHasMoreOlder(hasMore);
            setOldestCursor(nextCursor);
        } catch (e) {
            console.error('Error cargando mensajes anteriores:', e);
        } finally {
            setLoadingOlder(false);
        }
    };

    // Aceptar conversación (usuario que NO la creó da consentimiento para continuar)
    const acceptConversation = async () => {
        if (!selectedContact?.conversationId || isConversationCreator || isConversationAccepted) return;
        setIsAcceptingConv(true);
        try {
            const { error } = await supabase
                .from('conversations')
                .update({ acepted: true })
                .eq('id', selectedContact.conversationId);
            if (error) throw error;
            setIsConversationAccepted(true);
            // Actualizar estado local para que la conversación salga de 'Solicitudes' sin recargar
            setConversations(prev => prev.map(c =>
                c.conversationId === selectedContact.conversationId
                    ? { ...c, acepted: true }
                    : c
            ));
            toast.success('Conversación aceptada');
        } catch (e) {
            console.error('Error aceptando conversación:', e);
            toast.error('No se pudo aceptar');
        } finally {
            setIsAcceptingConv(false);
        }
    };

    // Rechazar conversación: por simplicidad bloqueamos la conversación (puede ajustarse a eliminar o marcar estado)
    const rejectConversation = async () => {
        if (!selectedContact?.conversationId || isConversationCreator || isConversationAccepted) return;
        setIsRejectingConv(true);
        try {
            // Bloqueamos para que el creador no pueda seguir (reutilizando toggle si no está ya bloqueada)
            const { data: convMeta, error: convErr } = await supabase
                .from('conversations')
                .select('blocked')
                .eq('id', selectedContact.conversationId)
                .single();
            if (convErr) throw convErr;
            if (!convMeta?.blocked) {
                await toggleConversationBlocked(selectedContact.conversationId, user?.id);
            }
            toast('Has rechazado la conversación');
            setIsConvBlocked(true);
            setBlockedBy(user?.id || null);
        } catch (e) {
            console.error('Error rechazando conversación:', e);
            toast.error('No se pudo rechazar');
        } finally {
            setIsRejectingConv(false);
        }
    };

    // Helper to detect if an element is visible in the viewport of chat area
    const isMessageVisible = (el) => {
        const container = chatAreaRef.current
        if (!el || !container) return false
        const cRect = container.getBoundingClientRect()
        const r = el.getBoundingClientRect()
        // consider visible if at least half height is inside
        const visibleTop = Math.max(r.top, cRect.top)
        const visibleBottom = Math.min(r.bottom, cRect.bottom)
        const visibleHeight = Math.max(0, visibleBottom - visibleTop)
        return visibleHeight >= Math.min(r.height, 36) / 2
    }

    // Maintain a set to avoid duplicate network updates
    const seenBufferRef = useRef(new Set())

    // Attempt to mark as seen messages that are on screen when focus or scroll changes
    const tryMarkVisibleAsSeen = async () => {
        try {
            if (!isWindowFocused) return
            if (!user?.id) return
            const container = chatAreaRef.current
            if (!container) return
            // query all message nodes with data attributes
            const nodes = container.querySelectorAll('[data-message-id]')
            const updates = []
            nodes.forEach((node) => {
                const id = node.getAttribute('data-message-id')
                const isOwn = node.getAttribute('data-message-own') === '1'
                if (!id || isOwn) return
                // find message in state
                const msg = chatMessages.find(m => String(m.id) === String(id))
                if (!msg) return
                const alreadySeen = Array.isArray(msg.seen) && msg.seen.includes(user.id)
                if (alreadySeen) return
                if (!isMessageVisible(node)) return
                const key = `${id}:${user.id}`
                if (seenBufferRef.current.has(key)) return
                seenBufferRef.current.add(key)
                updates.push({ id })
            })
            // Apply updates sequentially to avoid RLS/race issues
            for (const u of updates) {
                try {
                    const res = await appendUserToMessageSeen(u.id, user.id)
                    if (res?.updated) {
                        setChatMessages(prev => prev.map(m => m.id === u.id ? { ...m, seen: Array.isArray(m.seen) ? [...m.seen, user.id] : [user.id] } : m))
                    }
                } catch (err) {
                    // allow retry in future
                    seenBufferRef.current.delete(`${u.id}:${user.id}`)
                    console.error('No se pudo marcar como visto:', err)
                }
            }
        } catch (err) {
            console.error(err)
        }
    }

    // Re-check on focus, scroll, and when messages change
    useEffect(() => {
        tryMarkVisibleAsSeen()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isWindowFocused, chatMessages, selectedContact?.conversationId])

    const messageInputRef = useRef(null);

    // --- Restricción: creador solo puede enviar 1 mensaje hasta que el otro responda ---
    // isConversationCreator ya se setea al seleccionar la conversación (cuando created_by === user.id)
    // Calculamos si el creador debe quedar bloqueado para seguir enviando.
    const isCreatorSendingLocked = React.useMemo(() => {
        if (!isConversationCreator) return false; // Solo aplica al creador
        // Contar mensajes enviados por el usuario (sent) y recibidos del otro (received)
        const sentCount = chatMessages.filter(m => m.type === 'sent').length;
        const anyReceived = chatMessages.some(m => m.type === 'received');
        // Regla: si ya envió al menos 1 y aún no hay respuesta (received) -> bloqueo
        if (sentCount >= 1 && !anyReceived) return true;
        return false;
    }, [isConversationCreator, chatMessages]);

    const sendMessage = async () => {
        const content = messageInput.trim();
        if (!content) return;
        if (!selectedContact?.conversationId) {
            toast.error('No hay conversación activa');
            return;
        }
        if (isCreatorSendingLocked) {
            toast.info('Espera a que el otro usuario responda para continuar la conversación.');
            return;
        }
    const tempId = `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const optimistic = { id: tempId, type: 'sent', text: content, created_at: new Date().toISOString(), messageType: 'text' };
        setChatMessages(prev => [...prev, optimistic]);
        setMessageInput('');
        // Restablecer altura del textarea al tamaño base
        if (messageInputRef.current) {
            messageInputRef.current.style.height = '44px';
            // Forzar reflow opcional si fuera necesario
        }
        try {
            await insertMessage({ conversationId: selectedContact.conversationId, senderId: user?.id, content });
        } catch (e) {
            console.error('Error enviando mensaje:', e);
            toast.error('No se pudo enviar el mensaje');
            // opcional: revertir optimismo o marcar como fallido
        }
    };

    // Reutilizable: envía una foto (File/Blob) comprimiéndola y subiéndola al bucket 'chatphotos'
    const sendPhotoFile = async (file) => {
        if (!file || !selectedContact?.conversationId || isUploadingPhoto) return;
        if (!user?.id) {
            toast.error('Debes iniciar sesión para enviar fotos');
            return;
        }
        if (isCreatorSendingLocked) {
            toast.info('Espera a que el otro usuario responda antes de enviar más archivos.');
            return;
        }
        setIsUploadingPhoto(true);
        try {
            const options = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
                maxIteration: 10,
                initialQuality: 0.8,
            };

            let fileToUpload = file;
            try {
                const compressed = await imageCompression(file, options);
                const originalKb = (file.size / 1024).toFixed(0);
                const compressedKb = (compressed.size / 1024).toFixed(0);
                console.log(`Compresión imagen: ${originalKb}KB -> ${compressedKb}KB`);
                fileToUpload = compressed;
            } catch (compressErr) {
                console.warn('Fallo al comprimir, subiendo original:', compressErr);
            }

            const ext = ((fileToUpload.type || '').split('/')[1] || 'jpg').replace('jpeg', 'jpg');
            const fileName = `${Date.now()}.${ext}`;
            const path = `${user?.id}/${fileName}`;

            const tempId = `tmp-img-${Date.now()}-${Math.random().toString(16).slice(2)}`;
            const localPreviewUrl = URL.createObjectURL(fileToUpload);
            setChatMessages(prev => [...prev, { id: tempId, type: 'sent', text: localPreviewUrl, created_at: new Date().toISOString(), messageType: 'image' }]);

            const { error: uploadError } = await supabase.storage
                .from('chatphotos')
                .upload(path, fileToUpload, { upsert: true, contentType: fileToUpload.type || 'image/jpeg' });

            if (uploadError) {
                console.error('Error subiendo foto:', uploadError);
                toast.error(`No se pudo subir la foto: ${fmtErr(uploadError)}`);
                return;
            }

            const { data: publicData, error: pubErr } = supabase.storage
                .from('chatphotos')
                .getPublicUrl(path);

            if (pubErr) {
                console.error('Error obteniendo URL:', pubErr);
                toast.error(`No se pudo obtener la URL de la foto: ${fmtErr(pubErr)}`);
                return;
            }

            const photoUrl = publicData.publicUrl;

            await insertMessage({
                conversationId: selectedContact.conversationId,
                senderId: user?.id,
                content: photoUrl,
                type: 'image'
            });

            toast.success('Foto enviada');
            setChatMessages(prev => prev.map(m => m.id === tempId ? { ...m, text: photoUrl } : m));
        } catch (e) {
            console.error('Error enviando foto:', e);
            toast.error(`No se pudo enviar la foto: ${fmtErr(e)}`);
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    // Enviar la foto actualmente seleccionada desde el modal (antes duplicaba nombre de sendMessage)
    const sendSelectedPhoto = async () => {
        if (!selectedPhoto) return;
        await sendPhotoFile(selectedPhoto);
        // Si venía del modal de vista previa, ciérralo y limpia selección
        closePhotoPreviewModal();
    };

    // --- Envío de Video (Fase 1) ---
    const sendVideoFile = async (file) => {
        if (!file || !selectedContact?.conversationId) return;
        if (!user?.id) {
            toast.error('Debes iniciar sesión para enviar videos');
            return;
        }
        if (isCreatorSendingLocked) {
            toast.info('Espera a que el otro usuario responda antes de enviar más videos.');
            return;
        }
            messageInputRef.current.style.overflowY = 'hidden';
        // Validar tipo
        if (!file.type.startsWith('video/')) {
            toast.error('El archivo seleccionado no es un video válido');
            return;
        }
        // Validar tamaño
        if (file.size > MAX_VIDEO_BYTES) {
            const mb = (file.size / (1024*1024)).toFixed(1);
            toast.error(`Video demasiado grande (${mb} MB). Máximo ${MAX_VIDEO_MB} MB`);
            return;
        }
        try {
            const tempId = `tmp-vid-${Date.now()}-${Math.random().toString(16).slice(2)}`;
            const localUrl = URL.createObjectURL(file);
            // Mensaje optimista
            setChatMessages(prev => [...prev, { id: tempId, type: 'sent', text: localUrl, created_at: new Date().toISOString(), messageType: 'video', uploading: true }]);

            // Subir al bucket
            const { uploadVideoToBucket } = await import('./services/db');
            const { publicUrl } = await uploadVideoToBucket({ file, conversationId: selectedContact.conversationId, userId: user?.id });

            await insertMessage({
                conversationId: selectedContact.conversationId,
                senderId: user?.id,
                content: publicUrl,
                type: 'video'
            });
            // Reemplazar optimista
            setChatMessages(prev => prev.map(m => m.id === tempId ? { ...m, text: publicUrl, uploading: false } : m));
            toast.success('Video enviado');
        } catch (err) {
            console.error('Error enviando video:', err);
            toast.error('No se pudo enviar el video');
        }
    };

    const closePhotoPreviewModal = () => {
        setIsPhotoModalClosing(true);
        setTimeout(() => {
            setShowPhotoPreviewModal(false);
            setIsPhotoModalClosing(false);
            setSelectedPhoto(null);
        }, 300);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Dividir conversaciones en:
    // 1) Solicitudes entrantes: acepted == false (o null) y created_by != usuario actual
    // 2) Conversaciones normales: resto
    const chatRequestConversations = React.useMemo(() => {
        if (!user?.id) return [];
        return (conversations || []).filter(c => c.created_by !== user.id && !c.acepted);
    }, [conversations, user?.id]);
    const normalConversations = React.useMemo(() => {
        if (!user?.id) return conversations || [];
        return (conversations || []).filter(c => !(c.created_by !== user.id && !c.acepted));
    }, [conversations, user?.id]);

    const contacts = conversationsToContacts(normalConversations);
    const chatRequestContacts = conversationsToContacts(chatRequestConversations);

    // Cálculo del ancla para "visto" al estilo Messenger
    // Regla: mostrar mini avatar del otro usuario en:
    // - El último mensaje TUYO (sent) que esa persona haya visto (message.seen incluye su id)
    // - Si después de ese visto la otra persona escribió (mensaje received posterior),
    //   entonces mostrar en su último mensaje (received)
    const otherUserId = selectedContact?.profileId || null;
    const lastSeenSentIndex = React.useMemo(() => {
        if (!otherUserId || !Array.isArray(chatMessages) || chatMessages.length === 0) return -1;
        for (let i = chatMessages.length - 1; i >= 0; i--) {
            const m = chatMessages[i];
            if (m?.type === 'sent') {
                const seenArr = Array.isArray(m?.seen) ? m.seen : [];
                if (seenArr.includes(otherUserId)) return i;
            }
        }
        return -1;
    }, [chatMessages, otherUserId]);
    const lastReceivedIndex = React.useMemo(() => {
        if (!Array.isArray(chatMessages) || chatMessages.length === 0) return -1;
        for (let i = chatMessages.length - 1; i >= 0; i--) {
            if (chatMessages[i]?.type === 'received') return i;
        }
        return -1;
    }, [chatMessages]);
    const readReceiptIndex = React.useMemo(() => {
        // Solo mostrar si existe al menos un mensaje tuyo visto por la otra persona
        if (lastSeenSentIndex === -1) return -1;
        // Si la otra persona escribió después de ese visto, anclar en su último mensaje
        if (lastReceivedIndex > lastSeenSentIndex) return lastReceivedIndex;
        // De lo contrario, anclar en tu último mensaje visto
        return lastSeenSentIndex;
    }, [lastSeenSentIndex, lastReceivedIndex]);
    const filteredContacts = contacts.filter(contact =>
        (contact.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contact.lastMessage || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    const filteredChatRequestContacts = chatRequestContacts.filter(contact =>
        (contact.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contact.lastMessage || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Auto-colapsar y ocultar la sección de solicitudes cuando se vacía
    useEffect(() => {
        if (showChatRequests && filteredChatRequestContacts.length === 0) {
            setShowChatRequests(false);
        }
    }, [filteredChatRequestContacts.length, showChatRequests]);

    // Estado/refs para animar el icono de leído cuando "baja"
    const [animateReadReceipt, setAnimateReadReceipt] = useState(false);
    const prevReadReceiptIndexRef = useRef(-1);
    // Overlay: posición Y absoluta del icono de leído respecto a chatArea
    const [readReceiptTop, setReadReceiptTop] = useState(null);
    const readReceiptRef = useRef(null);
    useEffect(() => {
        // Evitar animación durante prepend de mensajes antiguos
        if (pendingPrependRef.current) {
            prevReadReceiptIndexRef.current = readReceiptIndex;
            return;
        }
        const prev = prevReadReceiptIndexRef.current;
        if (typeof readReceiptIndex === 'number' && readReceiptIndex !== -1) {
            if (typeof prev === 'number' && prev !== -1 && readReceiptIndex > prev) {
                prevReadReceiptIndexRef.current = readReceiptIndex;
                setAnimateReadReceipt(true);
                const t = setTimeout(() => setAnimateReadReceipt(false), 350);
                return () => clearTimeout(t);
            }
        }
        prevReadReceiptIndexRef.current = readReceiptIndex;
    }, [readReceiptIndex]);

    // Reset al cambiar de conversación
    useEffect(() => {
        prevReadReceiptIndexRef.current = -1;
        setAnimateReadReceipt(false);
        setReadReceiptTop(null);
    }, [selectedContact?.conversationId]);

    // Recalcular posición del icono de leído en el overlay derecho
    const recalcReadReceiptPosition = () => {
        try {
            const container = chatAreaRef.current;
            if (!container) return;
            if (readReceiptIndex == null || readReceiptIndex < 0) {
                setReadReceiptTop(null);
                return;
            }
            // Buscar el nodo del mensaje ancla
            const nodes = container.querySelectorAll('[data-message-id]');
            const targetNode = nodes[readReceiptIndex];
            if (!targetNode) {
                setReadReceiptTop(null);
                return;
            }
            const cRect = container.getBoundingClientRect();
            const r = targetNode.getBoundingClientRect();
            // Posicionar cerca de la base de la burbuja, con un pequeño offset
            const bubbleBaseY = r.bottom - 10; // 10px por encima para no salir del contenedor
            const top = bubbleBaseY - cRect.top + container.scrollTop;
            setReadReceiptTop(Math.max(0, top));
        } catch {}
    };

    // Recalcular cuando cambian mensajes, índice de leído, o tamaño de ventana
    useEffect(() => {
        recalcReadReceiptPosition();
        const onResize = () => recalcReadReceiptPosition();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatMessages, readReceiptIndex, selectedContact?.conversationId]);

    // Fallback: sondear periódicamente el estado 'seen' de los últimos mensajes por si algún UPDATE no llega por realtime
    useEffect(() => {
        if (!selectedContact?.conversationId) return;
        let cancelled = false;
        const intervalMs = 2500; // 2.5s, ligero para no saturar
        const tick = async () => {
            try {
                const msgs = chatMessagesRef.current || [];
                if (msgs.length === 0) return;
                // Tomar hasta 50 ids más recientes para reducir carga
                const recent = msgs.slice(-50);
                const ids = recent.map(m => m.id).filter(Boolean);
                if (ids.length === 0) return;
                const { data, error } = await supabase
                    .from('messages')
                    .select('id, seen, content, type, created_at, conversation_id')
                    .in('id', ids);
                if (error || !Array.isArray(data)) return;
                if (cancelled) return;
                const map = new Map(data.map(r => [r.id, r]));
                setChatMessages(prev => prev.map(m => {
                    const r = map.get(m.id);
                    if (!r) return m;
                    // Si hay novedad en 'seen', aplícala
                    const incomingSeen = Array.isArray(r.seen) ? r.seen : m.seen;
                    if (JSON.stringify(incomingSeen) !== JSON.stringify(m.seen)) {
                        return { ...m, seen: incomingSeen };
                    }
                    return m;
                }));
            } catch {}
        };
        const timer = setInterval(tick, intervalMs);
        return () => { cancelled = true; clearInterval(timer); };
    }, [selectedContact?.conversationId]);

    const toggleNewChatMenu = () => {
        setShowNewChatMenu(!showNewChatMenu);
    };

    const toggleChatOptions = () => {
        setShowChatOptionsMenu(!showChatOptionsMenu);
    };

    // Handler reutilizable para bloquear/desbloquear
    const handleToggleConversationBlocked = async () => {
        if (!selectedContact?.conversationId) {
            toast.error('No hay conversación activa');
            return;
        }
        if (isTogglingBlocked) return;
        setIsTogglingBlocked(true);
        try {
            const { blocked, blocked_by } = await toggleConversationBlocked(selectedContact.conversationId, user?.id);
            setIsConvBlocked(!!blocked);
            setBlockedBy(blocked ? blocked_by : null);
            if (blocked) {
                // Ya no vaciamos los mensajes; solo marcamos el estado de bloqueo para ocultar el input y deshabilitar envíos
                // Mantener historial permite que el usuario vea el contexto aun estando bloqueado.
                toast.success('Conversación bloqueada');
            } else {
                toast.success('Conversación desbloqueada');
                try {
                    let afterMessageId2 = null;
                    let afterTimestamp2 = null;
                    try {
                        const clearRow2 = await fetchLastClearChat(selectedContact.conversationId, user?.id);
                        afterMessageId2 = clearRow2?.message_id || null;
                        afterTimestamp2 = clearRow2?.pivot_created_at || null;
                    } catch (clrErr2) { /* ignore */ }
                    afterClearMessageIdRef.current = afterMessageId2;
                    const { messages, hasMore, nextCursor } = await fetchMessagesPage(selectedContact.conversationId, { limit: PAGE_SIZE, afterMessageId: afterMessageId2, afterTimestamp: afterTimestamp2 });
                    const mapped = messages.map(m => {
                        const base = { id: m.id, type: m.sender_id === user?.id ? 'sent' : 'received', created_at: m.created_at, messageType: m.type || 'text', seen: Array.isArray(m.seen) ? m.seen : [] };
                        if (m.type === 'audio') return { ...base, audioUrl: m.content, text: '(Audio)' };
                        if (m.type === 'video') return { ...base, text: m.content };
                        if (m.type === 'image') return { ...base, text: m.content };
                        return { ...base, text: m.content };
                    });
                    setChatMessages(mapped);
                    setHasMoreOlder(hasMore);
                    setOldestCursor(nextCursor);
                    setTimeout(() => { tryMarkVisibleAsSeen(); }, 0);
                } catch (loadErr) {
                    console.error('Error cargando mensajes tras desbloquear:', loadErr);
                }
            }
        } catch (e) {
            console.error('Error al cambiar bloqueo:', e);
            toast.error('No se pudo cambiar el estado de bloqueo');
        } finally {
            setIsTogglingBlocked(false);
        }
    };

    const createNewChat = () => {
        setModalType('chat');
        setShowContactModal(true);
        setShowNewChatMenu(false);
        // Reiniciar búsqueda del modal
        setSearchUserQuery('');
        setSearchUserResults([]);
        setIsSearchingUsers(false);
    };

    const createNewGroup = () => {
        setModalType('group');
        setSelectedGroupContacts([]);
        setShowContactModal(true);
        setShowNewChatMenu(false);
    };

    const closeContactModal = () => {
        setShowContactModal(false);
    };

    const toggleContactSelection = (contact) => {
        if (modalType === 'chat') {
            selectContact(contact);
            closeContactModal();
        } else {
            setSelectedGroupContacts(prev => {
                if (prev.find(c => c.name === contact.name)) {
                    return prev.filter(c => c.name !== contact.name);
                } else {
                    return [...prev, contact];
                }
            });
        }
    };

    // Wrapper para evitar recargar si se hace clic sobre el mismo contacto
    const handleSelectContact = (contact) => {
        if (selectedContact?.conversationId && contact?.conversationId && selectedContact.conversationId === contact.conversationId) {
            // Mismo chat: ignorar
            return;
        }
        // También comparar por profileId si aún no hay conversationId (chat recién iniciado)
        if (!contact?.conversationId && selectedContact?.profileId && contact?.profileId && selectedContact.profileId === contact.profileId) {
            return;
        }
        selectContact(contact);
    };

    const createGroupWithSelected = () => {
        if (selectedGroupContacts.length > 0) {
            // Reemplazar alert()
            toast.success(`Grupo creado con ${selectedGroupContacts.length} miembros.`, {
                style: {
                    background: 'var(--bg-chat)',
                    color: 'var(--text-primary)',
                },
            });
            closeContactModal();
        } else {
            toast.error('Selecciona al menos un contacto.', {
                 style: {
                    background: 'var(--bg-chat)',
                    color: 'var(--text-primary)',
                },
            });
        }
    };

    // Buscar perfiles en Supabase por username (coincidencias parciales, insensible a mayúsculas)
    useEffect(() => {
        if (!showContactModal || modalType !== 'chat') return;
        const q = searchUserQuery.trim();
        if (q === '') {
            setSearchUserResults([]);
            setIsSearchingUsers(false);
            return;
        }
        setIsSearchingUsers(true);
        const requestId = ++searchReqIdRef.current;
        const timer = setTimeout(async () => {
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, username, avatar_url')
                    .ilike('username', `%${q}%`)
                    .limit(15);
                if (requestId !== searchReqIdRef.current) return; // descartar resultados antiguos
                if (error) {
                    console.error('Error buscando perfiles:', error);
                    toast.error(`No se pudo buscar usuarios: ${error.message}`);
                    setSearchUserResults([]);
                } else {
                    setSearchUserResults(data || []);
                }
            } catch (err) {
                if (requestId !== searchReqIdRef.current) return;
                console.error('Excepción buscando perfiles:', err);
                toast.error('Error inesperado buscando usuarios');
                setSearchUserResults([]);
            } finally {
                if (requestId === searchReqIdRef.current) setIsSearchingUsers(false);
            }
        }, 350); // debounce
        return () => clearTimeout(timer);
    }, [searchUserQuery, showContactModal, modalType]);

    const handlePickProfile = async (profile) => {
        if (!user?.id) {
            toast.error('Debes iniciar sesión para empezar un chat');
            return;
        }
        if (!profile?.id) {
            toast.error('Perfil inválido');
            return;
        }
    const dismiss = toast.loading('Creando conversación...');
        try {
            // 1) Crear o recuperar conversación directa en la BD
            const conv = await createOrGetDirectConversation(user.id, profile.id);

            // 2) Armar el contacto seleccionado para la UI
            const nameFromProfile = (profile?.username || 'Usuario').trim();
            const contact = {
                name: nameFromProfile,
                status: '🟢',
                lastMessage: '',
                time: '',
                initials: initialsFrom(nameFromProfile),
                profileId: profile?.id,
                email: undefined,
                username: profile?.username,
                avatar_url: profile?.avatar_url,
                conversationId: conv?.id,
            };
            await selectContact(contact);
            closeContactModal();
            toast.success('Conversación lista', { id: dismiss });
            // refrescar lista de conversaciones
            try {
                const convs = await fetchUserConversations(user.id);
                setConversations(convs);
            } catch (e) {
                console.error('No se pudo actualizar conversaciones:', e);
            }
        } catch (err) {
            console.error('Error creando conversación:', err);
            toast.error(err?.message || 'No se pudo crear la conversación', { id: dismiss });
        } finally {
            // no-op
        }
    };

    // Cargar conversaciones del usuario autenticado
    useEffect(() => {
        let alive = true;
        const load = async () => {
            if (!user?.id) {
                setConversations([]);
                setLoadingConversations(false);
                return;
            }
            setLoadingConversations(true);
            try {
                const convs = await fetchUserConversations(user.id);
                if (!alive) return;
                setConversations(convs);
                // Importante: NO seleccionar automáticamente ninguna conversación
            } catch (e) {
                console.error('Error cargando conversaciones:', e);
            } finally {
                if (alive) setLoadingConversations(false);
            }
        };
        load();
        return () => { alive = false };
    }, [user?.id]);

    // Perfil basado en el usuario autenticado
    const displayName = (user?.fullName || user?.username || (user?.email ? user.email.split('@')[0] : '') || 'Usuario').trim();
    const initialsFrom = (value) => {
        const parts = (value || '').trim().split(/\s+/);
        const first = parts[0]?.[0] || 'U';
        const second = parts[1]?.[0] || parts[0]?.[1] || '';
        return (first + second).toUpperCase();
    };
    const myProfile = {
        name: displayName,
        initials: initialsFrom(displayName),
        phone: '+34 612 345 678',
    };

    // Estados para ProfileModal
    const [isEditingName, setIsEditingName] = useState(false);
    const [newProfileName, setNewProfileName] = useState(displayName);
    const [isEditProfilePaused, setEditProfilePaused] = useState(true);
    const [isEditProfileStopped, setEditProfileStopped] = useState(false);

    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [profileInfo, setProfileInfo] = useState();
    const [newProfileInfo, setNewProfileInfo] = useState();
    const [isInfoProfilePaused, setInfoProfilePaused] = useState(true);
    const [isInfoProfileStopped, setInfoProfileStopped] = useState(false);

    // Estado para mostrar el modal de cambiar contraseña
    const [showEditPasswordModal, setShowEditPasswordModal] = useState(false);

    const [isPhotoProfilePaused, setPhotoProfilePaused] = useState(true);
    const [isPhotoProfileStopped, setPhotoProfileStopped] = useState(false);

    const [isTypingProfilePaused, setTypingProfilePaused] = useState(true);
    const [isTypingProfileStopped, setTypingProfileStopped] = useState(false);

    const [isLockProfilePaused, setLockProfilePaused] = useState(true);
    const [isLockProfileStopped, setLockProfileStopped] = useState(false);

    // Mantener sincronizado el nombre editable cuando cambia el usuario y no se está editando
    useEffect(() => {
        if (!isEditingName) {
            setNewProfileName(displayName);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [displayName]);

    const handleApplyPersonalization = (values) => {
        setPersonalization(values);
        // Aquí puedes aplicar los cambios al chat, fondo, etc.
    };

    // Permitir salir del chat seleccionado con la tecla Escape
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' || e.key === 'Esc') {
                if (selectedContact) {
                    // Deseleccionar chat y limpiar UI relacionada
                    setSelectedContact(null);
                    setChatMessages([]);
                    setShowChatOptionsMenu(false);
                    setShowAttachMenu(false);
                }
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [selectedContact]);

    const [messageMenuOpenId, setMessageMenuOpenId] = useState(null);
    const messageMenuRef = useRef(null);

    useEffect(() => {
      function handleClickOutside(event) {
        if (messageMenuRef.current && !messageMenuRef.current.contains(event.target)) {
          setMessageMenuOpenId(null);
        }
      }
      if (messageMenuOpenId !== null) {
        document.addEventListener("mousedown", handleClickOutside);
      }
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [messageMenuOpenId]);

    // Sincronizar el estado del skeleton para permitir animación de salida
    useEffect(() => {
        if (!loadingConversations && showLoadingSkeleton && !skeletonExiting) {
            // Empezar animación de salida y desmontar luego de ~360ms
            setSkeletonExiting(true);
            const t = setTimeout(() => {
                setShowLoadingSkeleton(false);
                setSkeletonExiting(false);
            }, 380);
            return () => clearTimeout(t);
        }
        // Mientras esté cargando, aseguramos que el skeleton esté visible
        if (loadingConversations && !showLoadingSkeleton) {
            setShowLoadingSkeleton(true);
            setSkeletonExiting(false);
        }
    }, [loadingConversations]);

    // Sincronizar salida del skeleton de área de chat
    useEffect(() => {
        if (!loadingChatArea && showChatSkeleton && !chatSkeletonExiting) {
            setChatSkeletonExiting(true);
            const t = setTimeout(() => {
                setShowChatSkeleton(false);
                setChatSkeletonExiting(false);
            }, 240);
            return () => clearTimeout(t);
        }
        if (loadingChatArea && !showChatSkeleton) {
            setShowChatSkeleton(true);
            setChatSkeletonExiting(false);
        }
    }, [loadingChatArea]);

    // Nota: en vez de hacer early return, mostraremos un overlay mientras carga para permitir el fade-out sobre el contenido ya montado.

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Componente para mostrar las notificaciones */}
            <Toaster position="top-center" reverseOrder={false} />

            {/* Sidebar */}
            <Sidebar
                showSideMenu={showSideMenu}
                setShowSideMenu={setShowSideMenu}
                setShowProfileModal={setShowProfileModal}
                setShowConfigModal={setShowConfigModal}
                setShowPersonalizationModal={setShowPersonalizationModal}
                lottieOptions={lottieOptions}
                isProfilePaused={isProfilePaused}
                setProfilePaused={setProfilePaused}
                isProfileStopped={isProfileStopped}
                setProfileStopped={setProfileStopped}
                isConfigPaused={isConfigPaused}
                setConfigPaused={setConfigPaused}
                isConfigStopped={isConfigStopped}
                setConfigStopped={setConfigStopped}
                currentView={currentView}
                onViewChange={handleViewChange}
            />
            {/* Sidebar de contactos e Historias */}
            {currentView === 'chats' ? (
                loadingChatsSidebar ? (
                    <SidebarSkeleton />
                ) : (
                <div id="sidebar" className={`sidebar w-80 theme-bg-secondary theme-border border-r flex flex-col md:relative absolute z-20 h-full ${isSidebarOpen ? 'open' : ''}`}>
                    <div className="p-4 theme-border border-b">
                        <div className="flex items-center justify-between mb-4">
                            <h1 className="text-xl font-bold theme-text-primary">AguacaChat</h1>
                            <div className="flex items-center gap-2">
                                <button className="md:hidden p-2 rounded-lg theme-bg-chat" onClick={toggleSidebar}>
                                    ✕
                                </button>
                            </div>
                        </div>
                        <div className="relative">
                            <input
                                id="searchInput"
                                type="text"
                                placeholder="Buscar conversaciones..."
                                className="w-full p-3 pl-10 rounded-lg theme-bg-chat theme-text-primary theme-border border focus:outline-none focus:ring-2 focus:ring-teal-primary"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {/* 4. REEMPLAZO DEL ICONO DE BÚSQUEDA */}
                            <div className="absolute left-2 top-1/2 transform -translate-y-1/2 pointer-events-none w-6 h-6">
                                <Lottie options={lottieOptions.search} isPaused={isSearchPaused} isStopped={isSearchStopped} />
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto relative" style={{ backgroundColor: 'var(--bg-contacts)' }}>
                        {/* Sección plegable de Solicitudes de chat */}
                        {filteredChatRequestContacts.length > 0 && (
                            <div className="theme-border border-b">
                                <button
                                    type="button"
                                    onClick={() => setShowChatRequests(v => !v)}
                                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium theme-text-primary hover:theme-bg-chat transition-colors"
                                    aria-expanded={showChatRequests}
                                >
                                    <span className="flex items-center gap-2">
                                        <span className="inline-block px-2 py-0.5 text-[11px] rounded bg-teal-600/20 text-teal-400 font-semibold tracking-wide">Solicitudes de chat</span>
                                        <span className="text-xs theme-text-secondary">{filteredChatRequestContacts.length}</span>
                                    </span>
                                    <svg
                                        className={`w-4 h-4 transition-transform duration-200 ${showChatRequests ? 'rotate-180' : ''}`}
                                        fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                <div className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${showChatRequests ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    {showChatRequests && filteredChatRequestContacts.map((contact, index) => (
                                        <div
                                            key={`req-${index}`}
                                            className={`contact-item p-4 hover:theme-bg-chat cursor-pointer transition-colors border-t theme-border ${selectedContact?.conversationId === contact.conversationId ? 'theme-bg-chat pointer-events-none' : ''}`}
                                            onClick={() => handleSelectContact(contact)}
                                            aria-current={selectedContact?.conversationId === contact.conversationId ? 'true' : undefined}
                                            role="button"
                                        >
                                            <div className="flex items-center gap-3">
                                                {contact?.avatar_url ? (
                                                    <img src={contact.avatar_url} alt={contact.name} className="w-12 h-12 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-12 h-12 bg-gradient-to-br from-teal-primary to-teal-secondary rounded-full flex items-center justify-center">
                                                        <svg className="w-12 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
                                                        </svg>
                                                    </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center">
                                                        <p className={`font-semibold truncate ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{contact.name}</p>
                                                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{contact.time}</p>
                                                    </div>
                                                    <div className="flex justify-between items-center mt-1">
                                                        <p className={`text-sm truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} flex items-center gap-1`}>
                                                            {contact.lastMessageType === 'image' ? (
                                                                <>
                                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 opacity-70">
                                                                        <path d="M4 5a2 2 0 012-2h2.172a2 2 0 001.414-.586l.828-.828A2 2 0 0111.828 1h.344a2 2 0 011.414.586l.828.828A2 2 0 0015.828 3H18a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm2 0v12h12V5H6zm6 3a4 4 0 110 8 4 4 0 010-8z" />
                                                                    </svg>
                                                                    <span>Foto</span>
                                                                </>
                                                            ) : contact.lastMessageType === 'audio' ? (
                                                                <>
                                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 opacity-70">
                                                                        <path d="M12 14a3 3 0 003-3V7a3 3 0 10-6 0v4a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 0014 0h-2zM11 19.93V22h2v-2.07A8.001 8.001 0 0020 12h-2a6 6 0 11-12 0H4a8.001 8.001 0 007 7.93z" />
                                                                    </svg>
                                                                    <span>
                                                                        {(() => {
                                                                            const secs = audioPreviewDurations[contact.lastMessageId];
                                                                            return typeof secs === 'number' ? formatSeconds(secs) : 'Audio';
                                                                        })()}
                                                                    </span>
                                                                </>
                                                            ) : contact.lastMessageType === 'video' ? (
                                                                <>
                                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4 opacity-70">
                                                                        <path d="M17 10.5V6a2 2 0 00-2-2H5C3.895 4 3 4.895 3 6v12c0 1.105.895 2 2 2h10a2 2 0 002-2v-4.5l4 4v-11l-4 4z" />
                                                                    </svg>
                                                                    <span>Video</span>
                                                                </>
                                                            ) : (
                                                                contact.lastMessage
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {contacts.length === 0 && !loadingConversations && (
                            <div className="h-full flex flex-col items-center justify-center text-center px-6 gap-4">
                                <p className="theme-text-secondary">No tienes conversaciones todavía.</p>
                                <button onClick={createNewChat} className="px-4 py-2 rounded-lg bg-gradient-to-r from-teal-primary to-teal-secondary text-white hover:opacity-90 transition-opacity">Crear nueva conversación</button>
                            </div>
                        )}
                        {filteredContacts.map((contact, index) => (
                            <div
                                key={index}
                                className={`contact-item p-4 hover:theme-bg-chat cursor-pointer transition-colors border-b theme-border ${selectedContact?.conversationId === contact.conversationId || (selectedContact?.name === contact.name && !contact.conversationId) ? 'theme-bg-chat pointer-events-none' : ''}`}
                                onClick={() => handleSelectContact(contact)}
                                aria-current={selectedContact?.conversationId === contact.conversationId ? 'true' : undefined}
                                role="button"
                            >
                                <div className="flex items-center gap-3">
                                    {contact?.avatar_url ? (
                                        <img src={contact.avatar_url} alt={contact.name} className="w-12 h-12 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-12 h-12 bg-gradient-to-br from-teal-primary to-teal-secondary rounded-full flex items-center justify-center">
                                            <svg className="w-12 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
                                            </svg>
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center">
                                            <p className={`font-semibold truncate ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{contact.name}</p>
                                            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{contact.time}</p>
                                        </div>
                                        <div className="flex justify-between items-center mt-1">
                                            <p className={`text-sm truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} flex items-center gap-1`}>
                                                {contact.lastMessageType === 'image' ? (
                                                    <>
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 opacity-70">
                                                            <path d="M4 5a2 2 0 012-2h2.172a2 2 0 001.414-.586l.828-.828A2 2 0 0111.828 1h.344a2 2 0 011.414.586l.828.828A2 2 0 0015.828 3H18a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm2 0v12h12V5H6zm6 3a4 4 0 110 8 4 4 0 010-8z" />
                                                        </svg>
                                                        <span>Foto</span>
                                                    </>
                                                ) : contact.lastMessageType === 'audio' ? (
                                                    <>
                                                        {/* Icono de micrófono */}
                                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 opacity-70">
                                                            <path d="M12 14a3 3 0 003-3V7a3 3 0 10-6 0v4a3 3 0 003 3zm5-3a5 5 0 01-10 0H5a7 7 0 0014 0h-2zM11 19.93V22h2v-2.07A8.001 8.001 0 0020 12h-2a6 6 0 11-12 0H4a8.001 8.001 0 007 7.93z" />
                                                        </svg>
                                                        <span>
                                                            {(() => {
                                                                const secs = audioPreviewDurations[contact.lastMessageId];
                                                                return typeof secs === 'number' ? formatSeconds(secs) : 'Audio';
                                                            })()}
                                                        </span>
                                                    </>
                                                ) : contact.lastMessageType === 'video' ? (
                                                    <>
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4 opacity-70">
                                                            <path d="M17 10.5V6a2 2 0 00-2-2H5C3.895 4 3 4.895 3 6v12c0 1.105.895 2 2 2h10a2 2 0 002-2v-4.5l4 4v-11l-4 4z" />
                                                        </svg>
                                                        <span>Video</span>
                                                    </>
                                                ) : (
                                                    contact.lastMessage
                                                )}
                                            </p>
                                            {contact.unread > 0 && (
                                                <span className="bg-teal-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                                    {contact.unread}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div className="absolute bottom-6 right-6">
                            <div className="relative">
                                <button
                                    id="newChatBtn"
                                    onClick={toggleNewChatMenu}
                                    className={`w-14 h-14 rounded-full shadow-xl hover:shadow-2xl flex items-center justify-center transition-all duration-300 transform hover:scale-105 border-2 ${isDarkMode ? 'bg-[#1a2c3a] border-[#334155]' : 'bg-white border-[#e2e8f0]'} ${!isPlusStopped ? (isDarkMode ? 'bg-[#14b8a6]/80' : 'bg-[#a7f3d0]') : ''}`}
                                    onMouseEnter={() => setPlusStopped(false)}
                                    onMouseLeave={() => setPlusStopped(true)}
                                    aria-label="Nuevo chat"
                                    style={{ boxShadow: isDarkMode ? '0 6px 24px 0 rgba(20,184,166,0.25), 0 1.5px 6px 0 rgba(0,0,0,0.18)' : '0 6px 24px 0 rgba(20,184,166,0.18), 0 1.5px 6px 0 rgba(0,0,0,0.10)' }}
                                >
                                    <Lottie
                                        options={plusOptions}
                                        isStopped={isPlusStopped}
                                        height={44}
                                        width={44}
                                    />
                                </button>
                                <div id="newChatMenu" className={`absolute right-0 bottom-16 w-48 theme-bg-chat rounded-lg shadow-2xl border theme-border z-30 ${showNewChatMenu ? '' : 'hidden'}`}>
                                    <button onClick={createNewChat} className="w-full text-left p-3 hover:theme-bg-secondary theme-text-primary rounded-t-lg transition-colors">
                                        <span
                                            onMouseEnter={() => setIndividualStopped(false)}
                                            onMouseLeave={() => setIndividualStopped(true)}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                                        >
                                            <Lottie
                                                options={individualOptions}
                                                isStopped={isIndividualStopped}
                                                height={28}
                                                width={28}
                                            />
                                            <span>Nuevo Chat</span>
                                        </span>
                                    </button>
                                    <button onClick={createNewGroup} className="w-full text-left p-3 hover:theme-bg-secondary theme-text-primary rounded-b-lg transition-colors">
                                        <span
                                            onMouseEnter={() => setTeamStopped(false)}
                                            onMouseLeave={() => setTeamStopped(true)}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                                        >
                                            <Lottie
                                                options={teamOptions}
                                                isStopped={isTeamStopped}
                                                height={28}
                                                width={28}
                                            />
                                            <span>Nuevo Grupo</span>
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        {showNewChatMenu && (
                            <div className="fixed inset-0 z-20" onClick={() => setShowNewChatMenu(false)} />
                        )}
                    </div>
                </div>
                )
            ) : (
                <div className="w-80 theme-bg-secondary theme-border border-r flex flex-col h-full">
                    {loadingStories ? <StoriesSkeleton /> : <StoriesView ref={storiesViewRef} />}
                </div>
            )}

            {/* Área principal del chat */}
            <div className="flex-1 flex flex-col relative">
                {/* Header del área principal: solo cuando hay chat seleccionado */}
                {selectedContact && (
                    <div className="theme-bg-secondary theme-border border-b p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button className="md:hidden p-2 rounded-lg theme-bg-chat" onClick={toggleSidebar}>
                                ☰
                            </button>
                            {selectedContact?.avatar_url ? (
                                <img
                                    src={selectedContact.avatar_url}
                                    alt={selectedContact.name}
                                    className="w-12 h-12 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-12 h-12 bg-gradient-to-br from-teal-primary to-teal-secondary rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
                                    </svg>
                                </div>
                            )}
                            <div>
                                <h2 id="chatName" className="font-semibold theme-text-primary">{selectedContact.name}</h2>
                                <p id="chatStatus" className="text-sm theme-text-secondary">{selectedContact.status === '🟢' ? 'En línea' : selectedContact.status === '🟡' ? 'Ausente' : selectedContact.status}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <button
                                    onClick={toggleChatOptions}
                                    className={`p-2 rounded-lg theme-bg-chat transition-opacity flex flex-col gap-1 items-center justify-center w-10 h-10 ${(!selectedContact || isConvBlocked) ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
                                    title="Opciones del chat"
                                    disabled={!selectedContact || isConvBlocked}
                                    aria-disabled={!selectedContact || isConvBlocked}
                                >
                                    <span className="w-1 h-1 bg-current rounded-full"></span>
                                    <span className="w-1 h-1 bg-current rounded-full"></span>
                                    <span className="w-1 h-1 bg-current rounded-full"></span>
                                </button>
                                <div id="chatOptionsMenu" className={`absolute right-0 top-12 w-56 theme-bg-chat rounded-lg shadow-2xl border theme-border z-30 ${(showChatOptionsMenu && selectedContact && !isConvBlocked) ? '' : 'hidden'}`}>
                                    <button 
                                        onClick={() => {
                                            if (!selectedContact?.conversationId || !user?.id) {
                                                toast.error('No hay conversación o usuario válido');
                                                return;
                                            }
                                            setShowConfirmClearChat(true);
                                        }} 
                                        className="w-full text-left p-3 hover:theme-bg-secondary theme-text-primary transition-colors flex items-center gap-2"
                                        onMouseEnter={() => {
                                            setTrashStopped(true);
                                            setTimeout(() => {
                                                setTrashStopped(false);
                                                setTrashPaused(false);
                                            }, 10);
                                        }}
                                        onMouseLeave={() => setTrashPaused(true)}
                                    >
                                        <div className="w-5 h-5">
                                            <Lottie options={lottieOptions.trash} isPaused={isTrashPaused} isStopped={isTrashStopped}/>
                                        </div>
                                        <span>Limpiar chat</span>
                                    </button>
                                    <button onClick={() => { toast.success('Notificaciones silenciadas.'); toggleChatOptions(); }} className="w-full text-left p-3 hover:theme-bg-secondary theme-text-primary rounded-t-lg transition-colors flex items-center gap-2"
                                        onMouseEnter={() => {
                                            setMuteStopped(true);
                                            setTimeout(() => {
                                                setMuteStopped(false);
                                                setMutePaused(false);
                                            }, 10);
                                        }}
                                        onMouseLeave={() => setMutePaused(true)}
                                    >
                                        <div className="w-5 h-5">
                                            <Lottie
                                                options={lottieOptions.mute}
                                                isPaused={isMutePaused}
                                                isStopped={isMuteStopped}
                                                height={24} width={24}
                                            />
                                        </div>
                                        <span>Silenciar notificaciones</span>
                                    </button>
                                    <button
                                        onClick={async () => { await handleToggleConversationBlocked(); toggleChatOptions(); }}
                                        className="w-full text-left p-3 hover:theme-bg-secondary theme-text-primary transition-colores flex items-center gap-2"
                                        onMouseEnter={() => {
                                            setCallSilentStopped(true);
                                            setTimeout(() => {
                                                setCallSilentStopped(false);
                                                setCallSilentPaused(false);
                                            }, 10);
                                        }}
                                        onMouseLeave={() => setCallSilentPaused(true)}
                                    >
                                        <div className="w-5 h-5">
                                            <Lottie 
                                                options={lottieOptions.callSilent} 
                                                isPaused={isCallSilentPaused} 
                                                isStopped={isCallSilentStopped} 
                                                height={24} width={24} 
                                            />
                                        </div>
                                        <span>Bloquear</span>
                                    </button>
                                    <button 
                                        onClick={() => { alert('Ver información'); toggleChatOptions(); }} 
                                        className="w-full text-left p-3 hover:theme-bg-secondary theme-text-primary rounded-b-lg transition-colores flex items-center gap-2"
                                        onMouseEnter={() => {
                                            setInformationStopped(true);
                                            setTimeout(() => {
                                                setInformationStopped(false);
                                                setInformationPaused(false);
                                            }, 10);
                                        }}
                                        onMouseLeave={() => setInformationPaused(true)}
                                    >
                                        <div className="w-5 h-5">
                                            <Lottie 
                                                options={lottieOptions.information} 
                                                isPaused={isInformationPaused} 
                                                isStopped={isInformationStopped} 
                                                height={24} width={24} 
                                            />
                                        </div>
                                        <span>Ver información</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div
                    id="chatArea"
                    ref={chatAreaRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4 chat-container relative"
                    style={
        selectedContact
            ? (
                personalization.backgroundType === 'solid'
                    ? { background: personalization.backgroundColor }
                    : personalization.backgroundType === 'gradient'
                        ? { background: 'linear-gradient(135deg, #10b981, #14b8a6)' }
                        : personalization.backgroundType === 'image' && personalization.backgroundImage
                            ? { backgroundImage: `url(${personalization.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                            : {}
            )
            : (
                isDarkMode
                    ? { background: '#0d1a26' } // color original del modo oscuro (theme-bg-primary)
                    : { background: '#f8fafc' }
            )
    }
                    
                    onScroll={(e) => {
                        const el = e.currentTarget;
                        // stick-to-bottom tracking
                        const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 60;
                        stickToBottomRef.current = nearBottom;
                        // top detection for infinite load
                        if (el.scrollTop <= 80 && hasMoreOlder && !loadingOlder) {
                            loadOlderMessages();
                        }
                        // intentar marcar visibles como vistos durante el scroll
                        tryMarkVisibleAsSeen();
                        // recalcular posición del icono de leído
                        recalcReadReceiptPosition();
                    }}
                >
                    {/* Vista vacía para historias cuando no hay chat seleccionado y la vista activa es stories */}
                    {currentView === 'stories' && !selectedContact && !loadingChatArea && (
                        <CenterNoticeBox
                            title="Historias"
                            message={"Aquí podrás ver y crear historias efímeras que desaparecen en 24 horas. Sube una foto, video o texto creativo para compartir con tus contactos."}
                            variant="info"
                            actions={[{ label: 'Subir historia', onClick: () => storiesViewRef.current?.openUploadChoice?.(), variant: 'primary' }]}
                            className="scale-fade-in"
                        />
                    )}
                    {/* Vista de bienvenida de chats (solo cuando estamos en chats) */}
                    {currentView === 'chats' && !selectedContact && !loadingChatArea && (
                        <CenterNoticeBox
                            title="¡Bienvenido a AguacaChat 🥑"
                            message={"Selecciona una conversación en la izquierda o empieza un nuevo chat para enviar tu primer mensaje."}
                            variant="info"
                            actions={[{ label: 'Nuevo chat', onClick: createNewChat, variant: 'primary' }]}
                            className="scale-fade-in"
                        />
                    )}
                    {selectedContact && chatMessages.length === 0 && !loadingChatArea && !isConvBlocked && !isConversationAccepted && (
                        <>
                            {isConversationCreator ? (
                                <CenterNoticeBox
                                    title="Aún no hay mensajes"
                                    message={"Escribe tu primer mensaje. Se claro e incluye toda la información necesaria ya que no podrás seguir aguacachateando hasta que te acepten"}
                                    variant="neutral"
                                    className="scale-fade-in"
                                />
                            ) : (
                                <CenterNoticeBox
                                    title="Aún no hay mensajes"
                                    message={"Este usuario quiere iniciar una conversación contigo, aunque aún no envía su solicitud. \n\n ¿Qué quieres hacer? \n (No recomendamos aceptar conversaciones de desconocidos)"}
                                    variant="neutral"
                                    actions={[
                                        { label: isAcceptingConv ? 'Aceptando...' : 'Aceptar', onClick: acceptConversation, variant: 'primary', disabled: isAcceptingConv },
                                        { label: isRejectingConv ? 'Procesando...' : 'Rechazar', onClick: rejectConversation, variant: 'danger', disabled: isRejectingConv }
                                    ]}
                                    className="scale-fade-in"
                                />
                            )}
                        </>
                    )}
                    {selectedContact && chatMessages.length === 0 && !loadingChatArea && !isConvBlocked && isConversationAccepted && (
                        <>
                            <CenterNoticeBox
                                    title="Aún no hay mensajes"
                                    message={"Empieza la conversación enviando el primer mensaje."}
                                    variant="neutral"
                                    actions={[
                                    ]}
                                    className="scale-fade-in"
                                />
                        </>
                    )}
                    {selectedContact && isConvBlocked && (
                        user?.id === blockedBy ? (
                            <CenterNoticeBox
                                title="Conversación bloqueada"
                                message="No puedes enviar ni recibir mensajes en esta conversación."
                                variant="warning"
                                actions={[{ label: isTogglingBlocked ? 'Procesando...' : 'Desbloquear', onClick: handleToggleConversationBlocked, variant: 'primary', disabled: isTogglingBlocked }]}
                                className="scale-fade-in"
                            />
                        ) : (
                            <CenterNoticeBox
                                title="No puedes enviar mensajes a este chat"
                                message="Por alguna razón no tienes permitido enviar mensajes a esta conversación"
                                variant="warning"
                                actions={[{ label: 'Borrar chat', variant: 'danger'}]}
                                className="scale-fade-in"
                            />
                        )
                    )}
                    {selectedContact && !isConvBlocked && (
                        <>
                            {/* Loader de mensajes anteriores */}
                            {hasMoreOlder && (
                                <div className="w-full flex justify-center">
                                    <div className="text-xs px-3 py-1 rounded-full theme-bg-chat theme-text-secondary border theme-border">
                                        {loadingOlder ? 'Cargando mensajes...' : 'Desliza hacia arriba para ver más'}
                                    </div>
                                </div>
                            )}
                            {chatMessages.map((message, index) => {
                                const isOwn = message.type === 'sent';
                                // Determinar si se debe mostrar un divisor de fecha antes de este mensaje
                                const currentDate = message.created_at ? new Date(message.created_at) : null;
                                const prevMsg = index > 0 ? chatMessages[index - 1] : null;
                                const prevDate = prevMsg?.created_at ? new Date(prevMsg.created_at) : null;
                                let showDateDivider = false;
                                if (currentDate) {
                                    if (!prevDate) {
                                        showDateDivider = true; // primer mensaje con fecha
                                    } else {
                                        // Cambio de día (comparar yyyy-mm-dd)
                                        const cd = currentDate.getFullYear()+ '-' + currentDate.getMonth() + '-' + currentDate.getDate();
                                        const pd = prevDate.getFullYear()+ '-' + prevDate.getMonth() + '-' + prevDate.getDate();
                                        if (cd !== pd) showDateDivider = true;
                                    }
                                }
                                // Formatear etiqueta de fecha
                                let dateLabel = '';
                                if (currentDate) {
                                    const today = new Date();
                                    const yesterday = new Date();
                                    yesterday.setDate(today.getDate() - 1);
                                    const isToday = currentDate.toDateString() === today.toDateString();
                                    const isYesterday = currentDate.toDateString() === yesterday.toDateString();
                                    if (isToday) dateLabel = 'Hoy';
                                    else if (isYesterday) dateLabel = 'Ayer';
                                    else dateLabel = currentDate.toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'short', year: today.getFullYear() === currentDate.getFullYear() ? undefined : 'numeric' });
                                    // Capitalizar primera letra
                                    dateLabel = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
                                }
                                return (
                                    <React.Fragment key={index}>
                                        {showDateDivider && dateLabel && (
                                            <div className="w-full flex justify-center py-2 select-none">
                                                <div className="px-3 py-1 rounded-full text-xs font-medium theme-bg-chat theme-border theme-text-secondary shadow-sm">
                                                    {dateLabel}
                                                </div>
                                            </div>
                                        )}
                                        <div
                                            className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-center relative`}
                                            data-message-id={message.id}
                                            data-message-own={isOwn ? '1' : '0'}
                                        >
                                        {/* Avatar para recibidos */}
                                        {!isOwn && (
                                            selectedContact?.avatar_url ? (
                                                <img
                                                    src={selectedContact.avatar_url}
                                                    alt={selectedContact.name}
                                                    className="w-10 h-10 rounded-full object-cover mr-2"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 bg-gradient-to-br from-teal-primary to-teal-secondary rounded-full flex items-center justify-center mr-2">
                                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
                                                    </svg>
                                                </div>
                                            )
                                        )}
                                        {/* Mensaje burbuja */}
                                        <div
                                            className={`${isOwn ? 'message-sent rounded-br-md' : 'message-received rounded-bl-md'} max-w-xs lg:max-w-md px-4 py-2 rounded-2xl break-words flex flex-col relative theme-text-primary`}
                                            style={{
                                                background: isOwn
                                                    ? personalization.bubbleColors.sent
                                                    : personalization.bubbleColors.received,
                                                fontSize: personalization.fontSize
                                            }}
                                        >
                                            <div>
                                                {message.messageType === 'image' ? (
                                                    <img
                                                        src={message.text}
                                                        alt="Imagen"
                                                        loading="lazy"
                                                        className="rounded-lg cursor-pointer w-64 h-64 object-cover"
                                                        onClick={() => { setIsImageModalEntering(true); setImagePreviewUrl(message.text); setTimeout(() => setIsImageModalEntering(false), 10); }}
                                                    />
                                                ) : message.messageType === 'video' ? (
                                                    <VideoThumbnail
                                                        src={message.text}
                                                        loading={!!message.uploading}
                                                        onOpen={() => { setCurrentVideoSrc(message.text); setVideoModalOpen(true); }}
                                                    />
                                                ) : (message.messageType === 'audio' || message.audioUrl) ? (
                                                    <AudioPlayer src={message.audioUrl || message.text} className="w-full max-w-xs" variant="compact" />
                                                ) : (
                                                    <MessageRenderer text={message.text} chunkSize={450} />
                                                )}
                                            </div>
                                            <div className="text-[10px] self-end">
                                                {message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                            </div>
                                            {/* Eliminado: el icono de leído ahora va en un overlay fijo a la derecha */}
                                            {/* Botón de tres puntos solo para mensajes propios, dentro de la burbuja arriba a la derecha */}
                                            {isOwn && (
                                                <button
                                                    className="absolute -top-1 -right-0 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-teal-500 focus:outline-none"
                                                    style={{ background: 'transparent', border: 'none', padding: 0 }}
                                                    title="Más opciones"
                                                    onClick={() => {
                                                        if (messageMenuOpenId === index) {
                                                            setMessageMenuOpenId(null);
                                                        } else {
                                                            setMessageMenuOpenId(index);
                                                        }
                                                    }}
                                                >
                                                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                                                        <circle cx="4" cy="10" r="1.5" />
                                                        <circle cx="10" cy="10" r="1.5" />
                                                        <circle cx="16" cy="10" r="1.5" />
                                                    </svg>
                                                </button>
                                            )}
                                            {/* Menú contextual */}
                                            {isOwn && messageMenuOpenId === index && (
                                                <div
                                                    ref={messageMenuRef}
                                                    className="absolute right-5 top-6 w-40 theme-bg-chat theme-border rounded-lg shadow-lg z-50 animate-fade-in"
                                                >
                                                    <button
                                                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-200 rounded-lg"
                                                        onClick={() => {
                                                            toast.success('Información del mensaje (no implementado)');
                                                            setMessageMenuOpenId(null);
                                                        }}
                                                    >
                                                        Ver información
                                                    </button>
                                                    <button
                                                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-200 rounded-lg"
                                                        onClick={() => {
                                                            toast.success('Mensaje fijado.');
                                                            setMessageMenuOpenId(null);
                                                        }}
                                                    >
                                                        Fijar mensaje
                                                    </button>
                                                    <button
                                                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-200 rounded-lg"
                                                        onClick={() => {
                                                            toast.success('Editar mensaje (no implementado)');
                                                            setMessageMenuOpenId(null);
                                                        }}
                                                    >
                                                        Editar mensaje
                                                    </button>
                                                    <button
                                                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-200 rounded-lg"
                                                        onClick={() => {
                                                            toast.success('Mensaje eliminado.');
                                                            setMessageMenuOpenId(null);
                                                        }}
                                                    >
                                                        Eliminar mensaje
                                                    </button>
                                                </div>
                                            )}
                                 </div>
                                </div>
                             </React.Fragment>
                                );
                            })}
                            {/* Indicador de escribiendo */}
                            {selectedContact && isTyping && (
                                <div className="flex justify-start">
                                        {selectedContact?.avatar_url ? (
                                            <img
                                                src={selectedContact.avatar_url}
                                                alt={selectedContact.name}
                                                className="w-8 h-8 rounded-full object-cover mr-2"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 bg-gradient-to-br from-teal-primary to-teal-secondary rounded-full flex items-center justify-center text-white text-xs font-bold mr-2">
                                                {selectedContact?.initials}
                                            </div>
                                        )}
                                    <div className="message-received max-w-xs lg:max-w-md px-4 py-2 rounded-2xl rounded-bl-md">
                                        <div className="flex items-center gap-1">
                                            <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0s'}}></span>
                                            <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                                            <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* Overlay fijo del icono de leído, anclado a la banda derecha del chat */}
                            {selectedContact && readReceiptTop != null && (
                                <div
                                    className={`absolute`}
                                    style={{
                                        right: 4,
                                        top: readReceiptTop,
                                        zIndex: 10,
                                        pointerEvents: 'none',
                                    }}
                                    aria-label="Leído"
                                    title="Leído"
                                >
                                    {selectedContact?.avatar_url ? (
                                        <img
                                            src={selectedContact.avatar_url}
                                            alt={`Leído por ${selectedContact.name || 'contacto'}`}
                                            className={`w-5 h-5 rounded-full shadow read-receipt ${animateReadReceipt ? 'read-receipt-animate' : ''}`}
                                            style={{
                                                border: '2px solid',
                                                borderColor: 'var(--bg-secondary)'
                                            }}
                                        />
                                    ) : (
                                        <div
                                            className={`w-5 h-5 rounded-full bg-gradient-to-br from-teal-primary to-teal-secondary shadow flex items-center justify-center text-[10px] text-white font-bold read-receipt ${animateReadReceipt ? 'read-receipt-animate' : ''}`}
                                            style={{
                                                border: '2px solid',
                                                borderColor: 'var(--bg-secondary)'
                                            }}
                                        >
                                            {selectedContact?.initials?.slice(0,2) || '•'}
                                        </div>
                                    )}
                                </div>
                            )}
                            {!isConversationCreator && !isConversationAccepted && !isConvBlocked && chatMessages.length > 0 && (
                                <div className="mt-6 mb-2 w-full flex justify-center">
                                    <div className="px-4 py-3 rounded-lg text-xs sm:text-sm font-medium flex flex-col sm:flex-row items-stretch sm:items-center gap-3 theme-border border bg-teal-500/10 text-teal-300 backdrop-blur-sm shadow-sm w-full max-w-xl">
                                        <div className="flex items-center gap-2 flex-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                                            </svg>
                                            <span className="text-left">Este usuario quiere iniciar una conversación contigo. ¿Deseas aceptarla?</span>
                                        </div>
                                        <div className="flex items-center gap-2 sm:justify-end">
                                            <button
                                                onClick={acceptConversation}
                                                disabled={isAcceptingConv}
                                                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${isAcceptingConv ? 'opacity-60 cursor-not-allowed bg-teal-600/40' : 'bg-teal-600 hover:bg-teal-500 text-white'}`}
                                            >
                                                {isAcceptingConv ? 'Aceptando...' : 'Aceptar'}
                                            </button>
                                            <button
                                                onClick={rejectConversation}
                                                disabled={isRejectingConv}
                                                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${isRejectingConv ? 'opacity-60 cursor-not-allowed bg-rose-600/40' : 'bg-rose-600 hover:bg-rose-500 text-white'}`}
                                            >
                                                {isRejectingConv ? 'Procesando...' : 'Rechazar'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {isCreatorSendingLocked && !isConvBlocked && (
                                <div className="mt-6 mb-2 w-full flex justify-center">
                                    <div className="px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 theme-border border bg-amber-400/15 text-amber-300 backdrop-blur-sm shadow-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4.99c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z" />
                                        </svg>
                                        <span>Has enviado el primer mensaje. Espera la respuesta para continuar.</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {selectedContact && !isConvBlocked && (
                <div className="theme-bg-secondary theme-border border-t p-4">
                    <div className="flex items-center gap-3">
                        {/* 4. REEMPLAZO DEL ICONO DE ADJUNTAR */}
                        <button 
                            onClick={() => {
                                if (showAttachMenu) {
                                    if (!isAttachClosing) {
                                        setIsAttachClosing(true);
                                        setTimeout(() => {
                                            setShowAttachMenu(false);
                                            setIsAttachClosing(false);
                                        }, 400);
                                    }
                                } else {
                                    setShowAttachMenu(true);
                                }
                            }} 
                            className="p-1 rounded-lg theme-bg-chat hover:opacity-80 transition-opacity" 
                            title="Adjuntar archivo"
                            onMouseEnter={() => {
                                setLinkStopped(true);
                                setTimeout(() => {
                                    setLinkStopped(false);
                                    setLinkPaused(false);
                                }, 10);
                            }}
                            onMouseLeave={() => setLinkPaused(true)}
                        >
                            <div className="w-8 h-8">
                                <Lottie options={lottieOptions.link} isPaused={isLinkPaused} isStopped={isLinkStopped}/>
                            </div>
                        </button>
                        {(showAttachMenu || isAttachClosing) && (
                            <div
                                className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 ${isAttachClosing ? 'pointer-events-none anim-overlay-fade-out' : 'anim-overlay-fade-in'}`}
                                onClick={() => {
                                    if (!isAttachClosing) {
                                        setIsAttachClosing(true);
                                        setTimeout(() => {
                                            setShowAttachMenu(false);
                                            setIsAttachClosing(false);
                                        }, 400);
                                    }
                                }}
                            >
                                <div
                                    className={`theme-bg-secondary rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl modal-transition ${isAttachClosing ? 'anim-slide-out-right opacity-0 scale-90 translate-y-8' : 'anim-slide-in-left opacity-100 scale-100 translate-y-0'}`}
                                    onClick={e => e.stopPropagation()}
                                >
                                    <div className="p-5 theme-border border-b flex items-center justify-between">
                                        <h3 className="text-lg md:text-xl font-bold theme-text-primary">Selecciona multimedia</h3>
                                        <button
                                            onClick={() => {
                                                if (!isAttachClosing) {
                                                    setIsAttachClosing(true);
                                                    setTimeout(() => {
                                                        setShowAttachMenu(false);
                                                        setIsAttachClosing(false);
                                                    }, 400);
                                                }
                                            }}
                                            className="p-2 rounded-lg theme-bg-chat hover:opacity-80 transition-opacity" aria-label="Cerrar modal"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <div className="p-4 overflow-y-auto">
                                        <p className="theme-text-secondary text-sm mb-3">Fotos y videos recientes de esta sesión</p>
                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                            {/* Ver más (siempre a la izquierda) */}
                                            <button
                                                onClick={() => filePickerRef.current?.click()}
                                                className="flex flex-col items-center justify-center aspect-square rounded-lg theme-border border theme-bg-chat hover:opacity-90 transition-all"
                                            >
                                                <div
                                                    className="w-10 h-10"
                                                    onMouseEnter={() => {
                                                        setLinkStopped(true);
                                                        setTimeout(() => {
                                                            setLinkStopped(false);
                                                            setLinkPaused(false);
                                                        }, 10);
                                                    }}
                                                    onMouseLeave={() => setLinkPaused(true)}
                                                >
                                                    <Lottie options={lottieOptions.link} isPaused={isLinkPaused} isStopped={isLinkStopped} />
                                                </div>
                                                <span className="mt-1 text-sm theme-text-primary">Ver más</span>
                                                <span className="text-[10px] theme-text-secondary">Abrir explorador</span>
                                            </button>

                                            {/* Recientes */}
                                            {recentMedia.slice(0, 5).map((m) => (
                                                <button
                                                    key={m.id}
                                                    className="relative group aspect-square rounded-lg overflow-hidden theme-border border hover:ring-2 hover:ring-teal-primary transition-all"
                                                    title={m.name}
                                                    onClick={() => {
                                                        if (m.type === 'image') {
                                                            // Intentar reconstruir un File si es posible usando fetch del blob URL
                                                            const doSend = async () => {
                                                                try {
                                                                    // Si tenemos un objeto File original por haber sido seleccionado en este flujo
                                                                    if (m.file instanceof File) {
                                                                        await sendPhotoFile(m.file);
                                                                    } else if (m.url?.startsWith('blob:')) {
                                                                        const resp = await fetch(m.url);
                                                                        const blob = await resp.blob();
                                                                        // Crear un File para mantener nombre y tipo
                                                                        const fileName = m.name || `photo-${Date.now()}.jpg`;
                                                                        const mime = blob.type || 'image/jpeg';
                                                                        const file = new File([blob], fileName, { type: mime });
                                                                        await sendPhotoFile(file);
                                                                    } else {
                                                                        toast.error('No se pudo acceder a la foto reciente');
                                                                    }
                                                                } catch (err) {
                                                                    console.error('Fallo enviando foto reciente:', err);
                                                                    toast.error('No se pudo enviar la foto reciente');
                                                                }
                                                            };
                                                            doSend();
                                                            if (!isAttachClosing) {
                                                                setIsAttachClosing(true);
                                                                setTimeout(() => {
                                                                    setShowAttachMenu(false);
                                                                    setIsAttachClosing(false);
                                                                }, 400);
                                                            }
                                                        } else if (m.type === 'video') {
                                                            const doSendVideo = async () => {
                                                                try {
                                                                    if (m.file instanceof File) {
                                                                        await sendVideoFile(m.file);
                                                                    } else if (m.url?.startsWith('blob:')) {
                                                                        const resp = await fetch(m.url);
                                                                        const blob = await resp.blob();
                                                                        const fileName = m.name || `video-${Date.now()}.mp4`;
                                                                        const mime = blob.type || 'video/mp4';
                                                                        const file = new File([blob], fileName, { type: mime });
                                                                        await sendVideoFile(file);
                                                                    } else {
                                                                        toast.error('No se pudo acceder al video reciente');
                                                                    }
                                                                } catch (err) {
                                                                    console.error('Fallo enviando video reciente:', err);
                                                                    toast.error('No se pudo enviar el video');
                                                                }
                                                            };
                                                            doSendVideo();
                                                            if (!isAttachClosing) {
                                                                setIsAttachClosing(true);
                                                                setTimeout(() => {
                                                                    setShowAttachMenu(false);
                                                                    setIsAttachClosing(false);
                                                                }, 400);
                                                            }
                                                        }
                                                    }}
                                                >
                                                    {m.type === 'image' ? (
                                                        <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <video src={m.url} className="w-full h-full object-cover" muted playsInline />
                                                    )}
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"></div>
                                                    <span className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white capitalize">{m.type}</span>
                                                </button>
                                            ))}
                                        </div>

                                        {/* Input oculto para abrir el explorador */}
                                        <input
                                            ref={filePickerRef}
                                            type="file"
                                            accept="image/*,video/*"
                                            multiple
                                            className="hidden"
                                            onChange={(e) => {
                                                const files = Array.from(e.target.files || []);
                                                if (files.length === 0) return;
                                                setRecentMedia((prev) => {
                                                    let next = [...prev];
                                                    files.forEach((f, idx) => {
                                                        const now = Date.now();
                                                        const item = {
                                                            id: `${now}-${idx}-${f.name}`,
                                                            type: f.type.startsWith('video') ? 'video' : 'image',
                                                            name: f.name,
                                                            size: f.size,
                                                            lastModified: f.lastModified || now,
                                                            url: URL.createObjectURL(f),
                                                            file: f,
                                                            addedAt: now + idx,
                                                        };
                                                        next.push(item);
                                                        while (next.length > 4) {
                                                            const removed = next.shift();
                                                            try { URL.revokeObjectURL(removed.url); } catch {}
                                                        }
                                                    });
                                                    return next;
                                                });
                                                // Permitir volver a seleccionar el mismo archivo
                                                try { e.target.value = ''; } catch {}
                                            }}
                                        />

                                        {/* Estado vacío */}
                                        {recentMedia.length === 0 && (
                                            <div className="mt-4 text-center theme-text-secondary text-sm">
                                                No hay elementos recientes aún. Usa "Ver más" para elegir archivos.
                                            </div>
                                        )}
                                    </div>
                                    {/* Animaciones movidas a index.css (anim-overlay-fade-in/out, anim-slide-in-left/out-right) */}
                                </div>
                            </div>
                        )}
                        {/* Emoji Picker Button */}
                        <div className="relative" ref={emojiButtonRef}>
                            <button 
                                onClick={() => setShowEmojiPicker(v => !v)} 
                                className={`p-1 rounded-lg theme-bg-chat hover:opacity-80 transition-opacity ${showEmojiPicker ? 'ring-2 ring-teal-primary' : ''}`} 
                                title="Emojis"
                                onMouseEnter={() => {
                                    setSmileStopped(true);
                                    setTimeout(() => {
                                        setSmileStopped(false);
                                        setSmilePaused(false);
                                    }, 10);
                                }}
                                onMouseLeave={() => setSmilePaused(true)}
                            >
                                <div className="w-8 h-8">
                                    <Lottie options={lottieOptions.smile} isPaused={isSmilePaused} isStopped={isSmileStopped}/>
                                </div>
                            </button>
                            {showEmojiPicker && (
                                <EmojiPicker
                                    anchorRef={emojiButtonRef}
                                    dark={isDarkMode}
                                    onSelect={(emoji) => {
                                        if (!messageInputRef.current) return;
                                        const el = messageInputRef.current;
                                        const start = el.selectionStart || messageInput.length;
                                        const end = el.selectionEnd || messageInput.length;
                                        const newValue = messageInput.slice(0, start) + emoji + messageInput.slice(end);
                                        setMessageInput(newValue);
                                        requestAnimationFrame(() => {
                                            el.focus();
                                            const cursorPos = start + emoji.length;
                                            el.selectionStart = el.selectionEnd = cursorPos;
                                        });
                                    }}
                                    onClose={() => setShowEmojiPicker(false)}
                                />
                            )}
                        </div>
                        <div className="flex-1 relative">
                            {isRecording && (
                                <div className="absolute -top-12 left-0 right-0 flex items-center justify-between gap-3 px-3 py-2 rounded-xl theme-bg-chat theme-border border">
                                    <div className="flex items-center gap-2">
                                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                                            Grabando {formatSeconds(Math.min(recordingElapsed, MAX_RECORD_SECS))}/02:00
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={cancelRecording} className="px-2 py-1 rounded-md theme-bg-secondary theme-border border text-xs hover:opacity-80" title="Cancelar">
                                            Cancelar
                                        </button>
                                        {isRecordingPaused ? (
                                            <button onClick={resumeRecording} className="px-2 py-1 rounded-md bg-teal-600 text-white text-xs hover:opacity-90" title="Reanudar">
                                                Reanudar
                                            </button>
                                        ) : (
                                            <button onClick={pauseRecording} className="px-2 py-1 rounded-md bg-red-500 text-white text-xs hover:opacity-90" title="Pausar">
                                                Pausar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className="flex w-full items-center gap-3">
                                <textarea
                                    ref={messageInputRef}
                                    id="messageInput"
                                    className="flex-1 px-7 py-3 rounded-xl theme-bg-chat theme-text-primary focus:outline-none focus:ring-2 focus:ring-teal-primary resize-none leading-relaxed"
                                    style={{
                                        minHeight: '44px',
                                        maxHeight: '160px',
                                        lineHeight: '1.5',
                                        background: 'var(--bg-chat, #222)'
                                    }}
                                    value={messageInput}
                                    onChange={e => setMessageInput(e.target.value)}
                                    onInput={e => {
                                        e.target.style.height = '44px';
                                        const fullScrollHeight = e.target.scrollHeight;
                                        const capped = Math.min(fullScrollHeight, 160);
                                        e.target.style.height = capped + 'px';
                                        if (fullScrollHeight > 160) {
                                            e.target.style.overflowY = 'auto';
                                        } else {
                                            e.target.style.overflowY = 'hidden';
                                        }
                                    }}
                                    onKeyPress={handleKeyPress}
                                    rows={1}
                                    disabled={!selectedContact || isCreatorSendingLocked || (!isConversationCreator && !isConversationAccepted)}
                                    placeholder={
                                        !selectedContact
                                            ? 'Selecciona una conversación para empezar'
                                            : isCreatorSendingLocked
                                                ? 'Esperando respuesta del otro usuario...'
                                                : (!isConversationCreator && !isConversationAccepted)
                                                    ? 'Debes aceptar la conversación para responder'
                                                    : 'Escribe un mensaje...'
                                    }
                                />
                                {(isRecording || messageInput.trim().length === 0) ? (
                                    <button
                                        onClick={toggleRecording}
                                        className={`p-3 ${isRecording ? 'bg-red-500' : 'bg-gradient-to-r from-teal-primary to-teal-secondary'} text-white rounded-full hover:opacity-80 transition-opacity shrink-0 flex items-center justify-center`}
                                        disabled={!selectedContact || isCreatorSendingLocked || (!isConversationCreator && !isConversationAccepted)}
                                        title={isRecording ? (isRecordingPaused ? 'Reanudar grabación' : 'Pausar/Detener grabación') : 'Grabar audio'}
                                    >
                                        <div className="w-7 h-7">
                                            <Lottie options={isRecording ? lottieOptions.micRecording : lottieOptions.mic} isPaused={isRecording ? isRecordingPaused : isMicPaused} isStopped={isRecording ? false : isMicStopped}/>
                                        </div>
                                    </button>
                                ) : (
                                    <button
                                        onClick={sendMessage}
                                        className="p-3 bg-gradient-to-r from-teal-primary to-teal-secondary text-white rounded-full hover:opacity-80 transition-opacity shrink-0 flex items-center justify-center"
                                        disabled={!selectedContact || isCreatorSendingLocked || (!isConversationCreator && !isConversationAccepted)}
                                        onMouseEnter={() => {
                                            setSendStopped(true);
                                            setTimeout(() => {
                                                setSendStopped(false);
                                                setSendPaused(false);
                                            }, 10);
                                        }}
                                        onMouseLeave={() => setSendPaused(true)}
                                        title={isCreatorSendingLocked ? 'Esperando respuesta del otro usuario' : 'Enviar mensaje'}
                                    >
                                        <div className="w-7 h-7">
                                            <Lottie options={lottieOptions.send} isPaused={isSendPaused} isStopped={isSendStopped}/>
                                        </div>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                )}
                {/* Overlay del skeleton del área de chat al cambiar de conversación */}
                {showChatSkeleton && (
                    <div className={`absolute inset-0 z-40 theme-bg-secondary ${chatSkeletonExiting ? 'anim-fade-out-fast' : ''}`}>
                        <ChatAreaSkeleton />
                    </div>
                )}
            </div>

            {/* Modal de selección de contactos */}
            <div id="contactModal" className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 ${showContactModal ? '' : 'hidden'}`}>
                <div className="theme-bg-secondary rounded-2xl w-full max-w-md max-h-96 flex flex-col">
                    <div className="p-6 theme-border border-b">
                        <div className="flex items-center justify-between">
                            <h3 id="modalTitle" className="text-lg font-bold theme-text-primary">{modalType === 'chat' ? 'Nuevo Chat' : 'Nuevo Grupo'}</h3>
                            <button onClick={closeContactModal} className="p-2 rounded-lg theme-bg-chat hover:opacity-80 transition-opacity">
                                ✕
                            </button>
                        </div>
                        <p id="modalSubtitle" className="text-sm theme-text-secondary mt-2">
                            {modalType === 'chat' ? 'Escribe el nombre de usuario para buscar y empezar un chat' : 'Selecciona los contactos para agregar al grupo'}
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        {modalType === 'chat' ? (
                            <div className="flex flex-col gap-3">
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre de usuario"
                                    className="w-full p-3 rounded-lg theme-bg-chat theme-text-primary theme-border border focus:outline-none focus:ring-2 focus:ring-teal-primary"
                                    value={searchUserQuery}
                                    onChange={(e) => setSearchUserQuery(e.target.value)}
                                    autoFocus
                                />
                                {/* Resultados */}
                                <div id="searchResults" className="space-y-2">
                                    {isSearchingUsers && (
                                        <div className="text-sm theme-text-secondary">Buscando...</div>
                                    )}
                                    {!isSearchingUsers && searchUserQuery.trim() !== '' && searchUserResults.length === 0 && (
                                        <div className="text-sm theme-text-secondary">Sin resultados</div>
                                    )}
                                    {searchUserResults.map((p) => (
                                        <div
                                            key={p.id}
                                            className="p-3 rounded-lg flex items-center gap-3 cursor-pointer hover:theme-bg-secondary transition-colors theme-bg-chat"
                                            onClick={() => handlePickProfile(p)}
                                        >
                                            {p.avatar_url ? (
                                                <img
                                                    src={p.avatar_url}
                                                    alt={p.username || 'Usuario'}
                                                    className="w-10 h-10 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 bg-gradient-to-br from-teal-primary to-teal-secondary rounded-full flex items-center justify-center">
                                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
                                                    </svg>
                                                </div>
                                            )}
                                            <div className="flex flex-col">
                                                <h4 className="font-semibold theme-text-primary">{p.username || 'Usuario'}</h4>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div id="contactList" className="space-y-2">
                                {allContacts.map((contact, index) => (
                                    <div key={index} onClick={() => toggleContactSelection(contact)} className={`p-3 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-gray-700 transition-colors ${modalType === 'group' && selectedGroupContacts.find(c => c.name === contact.name) ? 'bg-teal-primary' : 'theme-bg-chat'}`}>
                                        {modalType === 'group' && (
                                            <input
                                                type="checkbox"
                                                checked={selectedGroupContacts.find(c => c.name === contact.name) ? true : false}
                                                readOnly
                                                className="form-checkbox h-5 w-5 text-teal-600 rounded"
                                            />
                                        )}
                                        <div className="w-10 h-10 bg-gradient-to-br from-teal-primary to-teal-secondary rounded-full flex items-center justify-center text-white font-bold">
                                            {contact.initials}
                                        </div>
                                        <h4 className="font-semibold theme-text-primary">{contact.name}</h4>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {modalType === 'group' && (
                        <div className="p-4 theme-border border-t">
                            <div id="groupActions" className="mb-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span id="selectedCount" className="theme-text-secondary">{selectedGroupContacts.length} contactos seleccionados</span>
                                    <button onClick={() => setSelectedGroupContacts([])} className="text-xs theme-text-secondary hover:opacity-80">Limpiar</button>
                                </div>
                                <button onClick={createGroupWithSelected} className="w-full p-3 bg-gradient-to-r from-teal-primary to-teal-secondary text-white rounded-lg hover:opacity-90 transition-opacity">
                                    👥 Crear Grupo
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de perfil */}
            {showConfirmClearChat && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-lg theme-bg-chat shadow-xl border theme-border p-5 animate-fade-in">
                        <h3 className="text-lg font-semibold mb-2 theme-text-primary">Confirmar limpieza</h3>
                        <p className="text-sm theme-text-secondary mb-4">Esto ocultará el historial anterior solo para ti. ¿Deseas continuar?</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowConfirmClearChat(false)}
                                className="px-4 py-2 rounded-md theme-bg-secondary theme-text-primary hover:opacity-80 text-sm"
                            >Cancelar</button>
                            <button
                                onClick={async () => {
                                    if (!selectedContact?.conversationId || !user?.id) {
                                        toast.error('No hay conversación o usuario válido');
                                        setShowConfirmClearChat(false);
                                        return;
                                    }
                                    try {
                                        let lastMessageId = null;
                                        if (Array.isArray(chatMessages) && chatMessages.length > 0) {
                                            for (let i = chatMessages.length - 1; i >= 0; i--) {
                                                if (chatMessages[i].id) { lastMessageId = chatMessages[i].id; break; }
                                            }
                                        }
                                        if (!lastMessageId) {
                                            toast('No hay mensajes que limpiar.', { icon: 'ℹ️' });
                                            setShowConfirmClearChat(false);
                                            return;
                                        }
                                        await clearChatForUser({ conversationId: selectedContact.conversationId, userId: user.id, messageId: lastMessageId });
                                        setChatMessages([]);
                                        toast.success('Chat limpiado.');
                                    } catch (e) {
                                        console.error('Error registrando limpieza de chat:', e);
                                        const msg = e?.message || e?.error_description || e?.error || 'No se pudo registrar la limpieza';
                                        toast.error(`No se pudo registrar la limpieza: ${msg}`);
                                    } finally {
                                        setShowConfirmClearChat(false);
                                        setShowChatOptionsMenu(false);
                                    }
                                }}
                                className="px-4 py-2 rounded-md bg-gradient-to-r from-teal-primary to-teal-secondary text-white text-sm hover:opacity-90"
                            >Limpiar</button>
                        </div>
                    </div>
                </div>
            )}
            <ProfileModal
                showProfileModal={showProfileModal}
                setShowProfileModal={setShowProfileModal}
                myProfile={myProfile}
                isEditingName={isEditingName}
                setIsEditingName={setIsEditingName}
                newProfileName={newProfileName}
                setNewProfileName={setNewProfileName}
                isEditProfilePaused={isEditProfilePaused}
                setEditProfilePaused={setEditProfilePaused}
                isEditProfileStopped={isEditProfileStopped}
                setEditProfileStopped={setEditProfileStopped}
                // Eliminado: props de edición de profileInfo
                lottieOptions={lottieOptions}
                setShowEditPasswordModal={setShowEditPasswordModal}
                showEditPasswordModal={showEditPasswordModal} // <-- Añade esta línea
                setPhotoProfilePaused={setPhotoProfilePaused}
                setPhotoProfileStopped={setPhotoProfileStopped}
                isPhotoProfilePaused={isPhotoProfilePaused}
                isPhotoProfileStopped={isPhotoProfileStopped}
                setTypingProfilePaused={setTypingProfilePaused}
                setTypingProfileStopped={setTypingProfileStopped}
                isTypingProfilePaused={isTypingProfilePaused}
                isTypingProfileStopped={isTypingProfileStopped}
                setLockProfilePaused={setLockProfilePaused}
                setLockProfileStopped={setLockProfileStopped}
                isLockProfilePaused={isLockProfilePaused}
                isLockProfileStopped={isLockProfileStopped}
            />

            {/* Modal de configuración */}
            <ConfigModal
                showConfigModal={showConfigModal}
                setShowConfigModal={setShowConfigModal}
                isDarkMode={isDarkMode}
                toggleTheme={toggleTheme}
            />

            {/* Modal de personalización */}
            <PersonalizationModal
                isOpen={showPersonalizationModal}
                onClose={() => setShowPersonalizationModal(false)}
                onApply={handleApplyPersonalization}
                personalization={personalization}
                setPersonalization={setPersonalization}
            />

            {/* Input oculto para seleccionar fotos */}
            <input
                type="file"
                ref={photoInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                        setSelectedPhoto(file);
                        setShowPhotoPreviewModal(true);
                    }
                }}
            />

            {/* Modal de vista previa de foto */}
            {(showPhotoPreviewModal || isPhotoModalClosing) && (
                <div
                    className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm transition-opacity duration-300 ${
                        isPhotoModalClosing ? 'opacity-0' : 'opacity-100'
                    }`}
                    onClick={closePhotoPreviewModal}
                >
                    <div
                        className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all duration-300 modal-transition ${
                            isPhotoModalClosing ? 'opacity-0 scale-90 translate-y-8' : 'opacity-100 scale-100 translate-y-0'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Vista previa de foto</h3>
                        <div className="mb-4">
                            <img
                                src={selectedPhoto ? URL.createObjectURL(selectedPhoto) : ''}
                                alt="Vista previa"
                                className="w-full h-64 object-cover rounded-lg"
                            />
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={closePhotoPreviewModal}
                                disabled={isUploadingPhoto}
                                className={`px-4 py-2 rounded-lg transition-colors ${isUploadingPhoto ? 'opacity-60 cursor-not-allowed' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={sendSelectedPhoto}
                                disabled={isUploadingPhoto}
                                className={`px-4 py-2 rounded-lg transition-colors text-white ${isUploadingPhoto ? 'bg-blue-400 cursor-wait' : 'bg-blue-500 hover:bg-blue-600'}`}
                            >
                                {isUploadingPhoto ? 'Enviando…' : 'Enviar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal de zoom para imágenes del chat con animación */}
            {(imagePreviewUrl || isImageModalClosing) && (
                <div
                    className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
                        (isImageModalClosing || isImageModalEntering) ? 'opacity-0' : 'opacity-100'
                    }`}
                    onClick={closeImagePreview}
                >
                    <div
                        className={`transform transition-all duration-300 modal-transition ${
                            (isImageModalClosing || isImageModalEntering) ? 'opacity-0 scale-90 translate-y-4' : 'opacity-100 scale-100 translate-y-0'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={imagePreviewUrl || ''}
                            alt="Vista ampliada"
                            className="max-w-[90vw] max-h-[85vh] rounded-xl shadow-2xl"
                        />
                    </div>
                    <button
                        className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-white/90 text-gray-800 hover:bg-white shadow"
                        onClick={(e) => { e.stopPropagation(); closeImagePreview(); }}
                    >
                        Cerrar
                    </button>
                </div>
            )}
            {/* Modal de reproducción de video */}
            <VideoModal
                open={videoModalOpen}
                src={currentVideoSrc}
                onClose={() => { setVideoModalOpen(false); setCurrentVideoSrc(null); }}
            />
            {/* Overlay de skeleton a pantalla completa mientras cargan conversaciones */}
            {showLoadingSkeleton && (
                <div className={`fixed inset-0 z-[60] theme-bg-primary theme-text-primary ${skeletonExiting ? 'anim-fade-out' : 'anim-fade-in'}`}>
                    <div className="flex h-full overflow-hidden">
                        <LeftToolbarSkeleton />
                        <SidebarSkeleton />
                        <ChatAreaSkeleton />
                    </div>
                </div>
            )}
        </div>
    );
};

// Estilos locales para la animación del menú inline de historias
// (Si ya tienes un archivo de animaciones global podrías moverlo allí)
const style = document.createElement('style');
if (!document.getElementById('inline-story-menu-anim')) {
    style.id = 'inline-story-menu-anim';
    style.innerHTML = `@keyframes inlineMenuIn {0% {opacity:0; transform: translateY(6px) scale(.96);} 100% {opacity:1; transform: translateY(0) scale(1);} } .animate-inline-menu { animation: inlineMenuIn .22s cubic-bezier(.4,.15,.2,1) forwards; }`;
    document.head.appendChild(style);
}

export default AguacateChat;