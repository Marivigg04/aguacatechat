// Externas
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import Lottie from 'react-lottie';
import imageCompression from 'browser-image-compression';
import toast, { Toaster } from 'react-hot-toast';

// Componentes internos
import SidebarSkeleton from './components/skeletons/SidebarSkeleton';
import ChatAreaSkeleton from './components/skeletons/ChatAreaSkeleton.jsx';
import StoriesSkeleton from './components/skeletons/StoriesSkeleton.jsx';
import LeftToolbarSkeleton from './components/skeletons/LeftToolbarSkeleton';
import Sidebar from './components/common/Sidebar';
import EmojiPicker from './components/chat/EmojiPicker.jsx';
import ChatImage from './components/chat/ChatImage.jsx';
import ChatArea from './components/chat/ChatArea.jsx';
import AudioPlayer from './components/players/AudioPlayer.jsx';
import MessageRenderer from './components/common/MessageRenderer.jsx';
import CenterNoticeBox from './components/common/CenterNoticeBox.jsx';
import VideoThumbnail, { VideoModal } from './components/common/VideoPlayer.jsx';
import MediaGalleryModal from './components/common/MediaGalleryModal.jsx';
import StoriesView from './components/stories/StoriesView';
import ProfileModal from './components/config/ProfileModal';
import ConfigModal from './components/config/ConfigModal';
import PersonalizationModal from './components/config/PersonalizationModal';

// Contextos y hooks
import { useAuth } from './context/AuthContext.jsx';
import useIsMobile from './hooks/useIsMobile.js';

// Servicios
import supabase from './services/supabaseClient';
import {
    createOrGetDirectConversation,
    fetchUserConversations,
    insertMessage,
    fetchMessagesPage,
    updateTable,
    uploadAudioToBucket,
    appendUserToMessageSeen,
    toggleConversationBlocked,
    clearChatForUser,
    fetchLastClearChat,
    deleteMessageById
} from './services/db';

// Animaciones y assets
import animationTrash from './animations/wired-flat-185-trash-bin-hover-pinch.json';
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

// Estilos
import './utils/css/AguacateChat.css';

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
    const isMobile = useIsMobile();
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
    // Evitar múltiples toasts al pausar/reanudar: mantenemos un único toast para 'Grabación en pausa'
    const pauseToastIdRef = useRef(null);
    const pauseToastPendingRef = useRef(false);
    const pauseToastTsRef = useRef(0);
    // Refs análogos para el toast de reanudar
    const resumeToastIdRef = useRef(null);
    const resumeToastPendingRef = useRef(false);
    const resumeToastTsRef = useRef(0);
    const resumeToastClearTimerRef = useRef(null);
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
    // Ayuda modal adjuntos
    const [showAttachHelp, setShowAttachHelp] = useState(false);
    const [showSideMenu, setShowSideMenu] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    // Datos del perfil de contacto (si se abre modal desde header de chat)
    const [contactProfileData, setContactProfileData] = useState(null);
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
    // Clave para almacenar la imagen de fondo (DataURL) en localStorage
    const PERSONAL_BG_IMAGE_KEY = 'aguacatechat_bg_image_v1';
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
            bubbleColors: { sent: '#DCF8C6', received: '#FFFFFF' },
            accentColor: '#14B8A6',
            fontSize: 16
        };
    };

    // Restaurada: función que lee personalización previa de cookies y si falla retorna defaults segun modo
    function loadInitialPersonalization() {
        try {
            const isDark = getCookie('darkMode') === 'true';
            const base = getDefaultPersonalization(isDark);
            const bgType = getCookie('personal_bgType');
            const bgColor = decodeURIComponent(getCookie('personal_bgColor') || '') || base.backgroundColor;
            const sent = decodeURIComponent(getCookie('personal_bubbleSent') || '') || base.bubbleColors.sent;
            const received = decodeURIComponent(getCookie('personal_bubbleReceived') || '') || base.bubbleColors.received;
            const fontSizeRaw = parseInt(getCookie('personal_fontSize'), 10);
            const fontSize = !isNaN(fontSizeRaw) && fontSizeRaw >= 10 && fontSizeRaw <= 26 ? fontSizeRaw : base.fontSize;
            // Intentar restaurar imagen desde localStorage (no se guarda en cookies por tamaño)
            let storedBgImage = '';
            try {
                storedBgImage = localStorage.getItem(PERSONAL_BG_IMAGE_KEY) || '';
            } catch {}
            return {
                backgroundType: bgType || base.backgroundType,
                backgroundColor: bgColor,
                // Si hay una imagen almacenada úsala (aunque el tipo actual no sea 'image', se conservará para cuando se seleccione de nuevo)
                backgroundImage: storedBgImage || base.backgroundImage,
                bubbleColors: { sent, received },
                accentColor: base.accentColor,
                fontSize,
            };
        } catch (e) {
            return getDefaultPersonalization(getCookie('darkMode') === 'true');
        }
    }

    const [personalization, setPersonalization] = useState(loadInitialPersonalization);
    // (Debug toast removed) lastSeenToastRef eliminado

    // Persistir personalización en cookies cada vez que cambie (solo campos solicitados)
    useEffect(() => {
        try {
            setCookie('personal_bgType', personalization.backgroundType);
            setCookie('personal_bgColor', encodeURIComponent(personalization.backgroundColor));
            setCookie('personal_bubbleSent', encodeURIComponent(personalization.bubbleColors.sent));
            setCookie('personal_bubbleReceived', encodeURIComponent(personalization.bubbleColors.received));
            setCookie('personal_fontSize', String(personalization.fontSize));
            // Guardar / limpiar imagen de fondo en localStorage
            try {
                if (personalization.backgroundImage && personalization.backgroundImage.startsWith('data:image')) {
                    localStorage.setItem(PERSONAL_BG_IMAGE_KEY, personalization.backgroundImage);
                } else if (!personalization.backgroundImage) {
                    localStorage.removeItem(PERSONAL_BG_IMAGE_KEY);
                }
            } catch (e2) {
                console.warn('No se pudo persistir imagen de fondo en localStorage', e2);
            }
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
    // --- Typing indicador remoto ---
    const typingTimeoutRef = useRef(null); // timeout para auto-off al dejar de escribir
    const selfTypingRef = useRef(false); // track estado enviado para evitar updates redundantes
    const lastTypingConvRef = useRef(null);

    const updateTypingRemote = async (conversationId, userId, flag) => {
        if (!conversationId || !userId) return;
        try {
            await updateTable('participants', { conversation_id: conversationId, user_id: userId }, { isTyping: flag });
        } catch (e) {
            console.warn('No se pudo actualizar isTyping remoto:', e?.message || e);
        }
    };

    const stopTypingImmediate = async () => {
        if (!selfTypingRef.current) return; // ya está en false remoto
        selfTypingRef.current = false;
        const convId = selectedContact?.conversationId;
        if (convId && user?.id) {
            updateTypingRemote(convId, user.id, false);
        }
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }
    };

    const triggerTyping = () => {
        const convId = selectedContact?.conversationId;
        if (!convId || !user?.id) return;
        lastTypingConvRef.current = convId;
        // Enviar TRUE sólo si aún no se marcó
        if (!selfTypingRef.current) {
            selfTypingRef.current = true;
            updateTypingRemote(convId, user.id, true);
        }
        // Reiniciar timeout
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            // Si la conversación activa cambió, evitar enviar
            if (lastTypingConvRef.current !== convId) return;
            stopTypingImmediate();
        }, 2500); // 2.5s sin teclear -> false
    };
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
    // Galería multimedia (imágenes + videos)
    const [mediaGalleryOpen, setMediaGalleryOpen] = useState(false);
    const [mediaGalleryIndex, setMediaGalleryIndex] = useState(0);
    // Cerrar galería automáticamente al cambiar o limpiar el chat seleccionado
    useEffect(() => {
        if (!selectedContact) {
            setMediaGalleryOpen(false);
            setMediaGalleryIndex(0);
        }
    }, [selectedContact]);

    // Cambiar vista y, si se pasa a historias, deseleccionar el chat y cerrar menús relacionados
    const handleViewChange = (view) => {
        setCurrentView(view);
        // Limpiar temporizador previo si existiera
        if (storiesLoadingTimerRef.current) {
            clearTimeout(storiesLoadingTimerRef.current);
            storiesLoadingTimerRef.current = null;
        }
        if (view === 'stories') {
            // Deseleccionar chat activo con animación y limpiar menús contextuales
            deselectWithAnimation(() => {
                setSelectedContact(null);
                setChatMessages([]);
                setShowChatOptionsMenu(false);
                setShowAttachMenu(false);
                setShowNewChatMenu(false);
            });
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

    // --- Sonidos y Notificaciones ---
    const NOTIFICATION_SETTINGS_KEY = 'aguacatechat_notifications_v1';
    const MUTED_CONVS_KEY = 'aguacatechat_muted_convs_v1';
    const loadMutedConversations = () => {
        try {
            const raw = localStorage.getItem(MUTED_CONVS_KEY);
            if (!raw) return new Set();
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return new Set(parsed.map(v => String(v)));
        } catch (e) {
            /* ignore */
        }
        return new Set();
    };
    const saveMutedConversations = (set) => {
        try { localStorage.setItem(MUTED_CONVS_KEY, JSON.stringify(Array.from(set))); } catch {}
    };
    const mutedConversationsRef = useRef(loadMutedConversations());
    // small state to force re-render if UI needs to reflect mute change
    const [mutedRenderTick, setMutedRenderTick] = useState(0);
    const isConversationMuted = (conversationId) => {
        try { return !!conversationId && mutedConversationsRef.current.has(String(conversationId)); } catch { return false; }
    };
    const toggleMuteConversation = (conversationId) => {
        if (!conversationId) return false;
        try {
            const key = String(conversationId);
            const s = new Set(mutedConversationsRef.current);
            let mutedNow;
            if (s.has(key)) {
                s.delete(key);
                mutedNow = false;
                toast.success('Notificaciones activadas.');
            } else {
                s.add(key);
                mutedNow = true;
                toast.success('Notificaciones silenciadas.');
            }
            mutedConversationsRef.current = s;
            saveMutedConversations(s);
            setMutedRenderTick(t => t + 1);
            return mutedNow;
        } catch (e) { return false; }
    };
    const loadNotificationSettings = () => {
        try {
            const raw = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    return {
                        all: parsed.all !== false, // default true
                        sound: parsed.sound !== false, // default true
                    };
                }
            }
        } catch {}
        return { all: true, sound: true };
    };
    const [notificationSettings, setNotificationSettings] = useState(loadNotificationSettings);
    useEffect(() => {
        try { localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(notificationSettings)); } catch {}
    }, [notificationSettings]);
    // Ref para que los handlers (realtime) siempre lean valores actuales sin necesidad de re-suscribir
    const notificationSettingsRef = useRef(notificationSettings);
    useEffect(() => { notificationSettingsRef.current = notificationSettings; }, [notificationSettings]);

    // --- Privacidad ---
    const PRIVACY_SETTINGS_KEY = 'aguacatechat_privacy_v1';
    const loadPrivacySettings = () => {
        try {
            const raw = localStorage.getItem(PRIVACY_SETTINGS_KEY);
            if (raw) {
                const p = JSON.parse(raw);
                if (p && typeof p === 'object') {
                    return {
                        readReceipts: p.readReceipts !== false,
                        showStatus: p.showStatus !== false,
                        showLastConex: p.showLastConex !== false,
                    };
                }
            }
        } catch {}
        return { readReceipts: true, showStatus: true, showLastConex: true };
    };
    const [privacySettings, setPrivacySettings] = useState(loadPrivacySettings);
    const privacySettingsRef = useRef(privacySettings);
    const prevPrivacyRef = useRef(privacySettings);
    useEffect(() => { privacySettingsRef.current = privacySettings; }, [privacySettings]);
    useEffect(() => {
        try { localStorage.setItem(PRIVACY_SETTINGS_KEY, JSON.stringify(privacySettings)); } catch {}
        // Si se desactiva mostrar estado, aseguramos que aparezca offline en la base.
        const prev = prevPrivacyRef.current;
        if (prev.showStatus && !privacySettings.showStatus && user?.id) {
            try { updateTable('profiles', { id: user.id }, { isOnline: false }); } catch {}
        }
        // Si se desactiva mostrar última conexión eliminamos el valor público
        if (prev.showLastConex && !privacySettings.showLastConex && user?.id) {
            try { updateTable('profiles', { id: user.id }, { lastConex: null }); } catch {}
        }
        prevPrivacyRef.current = privacySettings;
    }, [privacySettings, user?.id]);

    const audioCtxRef = useRef(null);
    const ensureAudioCtx = () => {
        if (audioCtxRef.current) return audioCtxRef.current;
        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return null;
            audioCtxRef.current = new Ctx();
            return audioCtxRef.current;
        } catch { return null; }
    };
    // Helper: fetch story metadata by story id and derive replyContentType
    const fetchStoryMeta = async (storyId, rawContent = '', msgType = '') => {
        if (!storyId) return null;
        try {
            const { data: hist, error: histErr } = await supabase
                .from('histories')
                .select('id, user_id, content_url, content_type, caption, bg_color, font_color')
                .eq('id', storyId)
                .single();
            if (histErr || !hist) return null;
            // Determine reply content type: prefer the history content_type when available,
            // otherwise infer from the message content or msgType fallback.
            let replyContentType = 'text';
            if (hist.content_type && typeof hist.content_type === 'string') {
                // Normalize common values
                const ct = hist.content_type.toLowerCase();
                if (ct.includes('video') || ct === 'video') replyContentType = 'video';
                else if (ct.includes('image') || ct === 'image') replyContentType = 'image';
                else replyContentType = 'text';
            } else if (rawContent && typeof rawContent === 'string' && rawContent.startsWith('http')) {
                if (/\.(mp4|webm)(\?|$)/i.test(rawContent)) replyContentType = 'video';
                else if (/\.(jpe?g|png|webp|gif)(\?|$)/i.test(rawContent)) replyContentType = 'image';
                else replyContentType = 'text';
            } else if (msgType === 'audio') replyContentType = 'audio';

            return {
                storyId: hist.id,
                ownerId: hist.user_id,
                contentType: hist.content_type,
                contentUrl: hist.content_url,
                caption: hist.caption,
                bg_color: hist.bg_color,
                font_color: hist.font_color,
                replyContentType,
            };
        } catch (e) {
            return null;
        }
    };
    const playNotificationSound = (conversationId) => {
        // If conversation is muted, skip sound
        if (conversationId && isConversationMuted(conversationId)) return;
        const settings = notificationSettingsRef.current;
        if (!settings?.all) return; // notificaciones desactivadas
        if (!settings?.sound) return; // sonido desactivado
        try {
            const ctx = ensureAudioCtx();
            if (!ctx) return;
            if (ctx.state === 'suspended') ctx.resume().catch(()=>{});
            const now = ctx.currentTime;
            // Sonido único de campana (antes era la variante "normal").
            const baseFreq = 660;
            const partials = [1, 2.01, 2.99, 4.23];
            const decay = 0.9;
            partials.forEach((ratio, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(baseFreq * ratio, now);
                const attack = 0.008 + i * 0.003;
                gain.gain.setValueAtTime(0.0001, now);
                gain.gain.exponentialRampToValueAtTime(0.3 / (i + 1), now + attack);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);
                if (i === 0) {
                    const lfo = ctx.createOscillator();
                    const lfoGain = ctx.createGain();
                    lfo.frequency.setValueAtTime(5, now);
                    lfoGain.gain.setValueAtTime(8, now);
                    lfo.connect(lfoGain).connect(osc.frequency);
                    lfo.start(now);
                    lfo.stop(now + 0.5);
                }
                osc.connect(gain).connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.9);
            });
        } catch { /* ignore */ }
    };

    const requestNotificationPermissionIfNeeded = async () => {
        if (!('Notification' in window)) return false;
        if (Notification.permission === 'granted') return true;
        if (Notification.permission === 'denied') return false;
        try {
            const perm = await Notification.requestPermission();
            return perm === 'granted';
        } catch { return false; }
    };
    const showBrowserNotification = async ({ conversationId, contactName, body, isNewChat }) => {
        const settings = notificationSettingsRef.current;
        if (!settings?.all) return; // no mostrar si está desactivado
        if (!('Notification' in window)) return;
        // If conversation muted, skip browser notification
        if (conversationId && isConversationMuted(conversationId)) return;
        // No mostrar si pestaña visible y ventana enfocada
        if (document.visibilityState === 'visible' && document.hasFocus()) return;
        const granted = await requestNotificationPermissionIfNeeded();
        if (!granted) return;
        const n = new Notification(contactName || 'Nuevo mensaje', {
            body: body || 'Tienes un nuevo mensaje',
            tag: `conv-${conversationId || contactName || Math.random()}`,
            renotify: true,
        });
        n.onclick = () => {
            try { window.focus(); } catch {}
            // Despachar evento personalizado para seleccionar el chat
            if (conversationId) {
                window.dispatchEvent(new CustomEvent('aguacatechat:focus-conversation', { detail: { conversationId } }));
            }
            n.close();
        };
        // Sonido
        playNotificationSound(conversationId);
    };

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
    // --- Persistencia de contadores de mensajes no leídos ---
    const UNREAD_LS_KEY = 'aguacatechat_unread_v1';
    const unreadRef = useRef({});
    const loadUnreadFromStorage = () => {
        try {
            const raw = localStorage.getItem(UNREAD_LS_KEY);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') return parsed;
        } catch { /* ignore */ }
        return {};
    };
    const saveUnreadToStorage = (data) => {
        try { localStorage.setItem(UNREAD_LS_KEY, JSON.stringify(data)); } catch { /* ignore */ }
    };
    const [_, forceUnreadRender] = useState(0);
    useEffect(() => {
        unreadRef.current = loadUnreadFromStorage();
        forceUnreadRender(v => v + 1);
    }, []);
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
        // Formatea un ISO timestamp a formato 12H: h:mm AM/PM
        const formatTime12 = (iso) => {
            if (!iso) return '';
            const d = new Date(iso);
            if (Number.isNaN(d.getTime())) return '';
            // toLocaleTimeString con hour12: true garantiza formato 12H y localiza AM/PM
            return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
        };
        const formatLastConex = (iso) => {
            if (!iso) return 'Desconectado';
            const d = new Date(iso);
            if (Number.isNaN(d.getTime())) return 'Desconectado';

            const now = new Date();
            // Comparar por componente de fecha local (no UTC) para determinar si es el mismo día
            const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
            if (sameDay) {
                return `Última conexión a las ${formatTime12(iso)}`;
            }
            // Si no es el mismo día, mostrar fecha en formato dd/mm/aaaa
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `Última conexión el ${day}/${month}/${year}`;
        };
        return (convs || []).map((c) => {
            const username = c?.otherProfile?.username || 'Usuario';
            const name = username.trim();
            const lastType = c?.last_message?.type || 'text';
            const lastContentRaw = c?.last_message?.content || '';
            let lastContent = lastType === 'image' ? 'Foto' : lastContentRaw;
            // Si el último mensaje lo envió el usuario actual, anteponer 'Tu:' (evitar duplicados)
            try {
                if (c?.last_message?.sender_id && user?.id && String(c.last_message.sender_id) === String(user.id)) {
                    const lc = typeof lastContent === 'string' ? lastContent.trim() : String(lastContent || '');
                    if (!lc.toLowerCase().startsWith('tu:')) {
                        lastContent = `Tu: ${lastContent}`;
                    }
                }
            } catch (e) {
                // Silenciar cualquier error de comparación
            }
            const lastAt = c?.last_message_at || c?.created_at;
            // Derivados del último mensaje
            const lastId = c?.last_message?.id ?? null;
            const lastAudioUrl = lastType === 'audio' ? c?.last_message?.content : undefined;
            // `seen` is stored as a single user id (string) or null for direct conversations
            const lastMessageSeenId = (c?.last_message?.seen && typeof c.last_message.seen === 'string') ? c.last_message.seen : null;
            // Determinar si la otra persona (otherProfile.id) vio el último mensaje (solo aplica si el último mensaje lo enviaste tú)
            let lastMessageSeen = false;
            try {
                if (c?.last_message?.sender_id && user?.id && String(c.last_message.sender_id) === String(user.id) && c?.otherProfile?.id) {
                    lastMessageSeen = lastMessageSeenId === c.otherProfile.id;
                }
            } catch (e) { /* ignore */ }
            // Debug: loguear el estado de visto para ayudar a depuración
            try {
                // eslint-disable-next-line no-console
            } catch (e) {}
            // console.log('Contact', name, 'isOnline:', c?.otherProfile?.isOnline, 'status:', c?.otherProfile?.isOnline ? '🟢' : formatLastConex(c?.otherProfile?.lastConex));
            const unreadMap = unreadRef.current || {};
            const unread = c?.conversationId ? (unreadMap[c.conversationId] || 0) : 0;
            const privacy = privacySettingsRef.current;
            // Construir status según privacidad
            let computedStatus;
            const remoteLastConexAvailable = !!c?.otherProfile?.lastConex; // solo si el remoto decidió exponerlo (no lo limpiamos si lo ocultó -> podría ser null más adelante)
            const canShowLast = privacy?.showLastConex && remoteLastConexAvailable;
            if (privacy?.showStatus) {
                computedStatus = c?.otherProfile?.isOnline ? '🟢' : (canShowLast ? formatLastConex(c?.otherProfile?.lastConex) : '');
            } else {
                computedStatus = canShowLast ? formatLastConex(c?.otherProfile?.lastConex) : '';
            }
            return {
                name,
                status: computedStatus,
                lastMessage: lastContent,
                lastMessageType: lastType,
                lastMessageId: lastId,
                lastAudioUrl,
                time: formatTime12(lastAt),
                initials: deriveInitials(name),
                profileId: c?.otherProfile?.id,
                username: c?.otherProfile?.username,
                avatar_url: c?.otherProfile?.avatar_url,
                profileInformation: c?.otherProfile?.profileInformation,
                conversationId: c?.conversationId,
                last_message_at: lastAt,
                lastConex: c?.otherProfile?.lastConex,
                last_message: c?.last_message ? { ...c.last_message, type: lastType } : null,
                // Exponer 'seen' (single id) y un booleano útil para la UI
                lastMessageSeen: privacy?.readReceipts ? lastMessageSeen : false,
                lastMessageSeenId: privacy?.readReceipts ? lastMessageSeenId : null,
                unread,
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
                            { type: 'sent', audioUrl: localUrl, text: '(Audio)', created_at: new Date().toISOString(), messageType: 'audio', replyTo: replyToMessage ? replyToMessage.id : null },
                        ]);

                        if (!selectedContact?.conversationId) {
                            toast.error('No hay conversación activa para subir el audio');
                        } else {
                            try {
                                        // Post-proceso: recolectar story replies sin metadata (nuevo formato sin prefijo) y hacer fetch batch de historias
                                        try {
                                            setTimeout(async () => {
                                                const current = chatMessagesRef.current || [];
                                                const missing = current.filter(mm => mm.messageType && mm.type === undefined && mm.storyReply == null && mm.replyTo && mm.messageType !== 'image' && mm.messageType !== 'video' && mm.messageType !== 'audio' && mm.messageType !== 'text');
                                            }, 0);
                                        } catch {}
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
                                    replyTo: replyToMessage ? replyToMessage.id : null,
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
            // Dismiss any lingering pause toast
            try { if (pauseToastIdRef.current) { toast.dismiss(pauseToastIdRef.current); pauseToastIdRef.current = null; } } catch(e){}
            // Dismiss any lingering resume toast and clear its cleanup timer
            try { if (resumeToastIdRef.current) { toast.dismiss(resumeToastIdRef.current); resumeToastIdRef.current = null; } } catch(e){}
            try { if (resumeToastClearTimerRef.current) { clearTimeout(resumeToastClearTimerRef.current); resumeToastClearTimerRef.current = null; } } catch(e){}
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
                // Solo crear un toast de pausa si no existe ya uno activo
                try {
                    if (!pauseToastIdRef.current) {
                        pauseToastIdRef.current = toast('Grabación en pausa', { icon: '⏸️' });
                    }
                } catch(e) { /* ignore toast errors */ }
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
                // Dismiss pause toast if present before showing resume toast
                try { if (pauseToastIdRef.current) { toast.dismiss(pauseToastIdRef.current); pauseToastIdRef.current = null; } } catch(e){}
                try { pauseToastPendingRef.current = false; pauseToastTsRef.current = 0; } catch(e){}
                // Crear toast de reanudación con deduplicado similar al de pausa
                try {
                    const now = Date.now();
                    if (resumeToastIdRef.current || resumeToastPendingRef.current) {
                        resumeToastTsRef.current = now;
                    } else if (now - (resumeToastTsRef.current || 0) > 400) {
                        resumeToastPendingRef.current = true;
                        try {
                            // limpiar cualquier toast de pausa existente por si acaso
                            try { if (pauseToastIdRef.current) { toast.dismiss(pauseToastIdRef.current); pauseToastIdRef.current = null; } } catch(e){}
                            // crear toast de reanudación
                            resumeToastIdRef.current = toast('Reanudando grabación', { icon: '▶️' });
                            resumeToastTsRef.current = Date.now();
                            // programar limpieza del id para permitir futuros toasts
                            if (resumeToastClearTimerRef.current) clearTimeout(resumeToastClearTimerRef.current);
                            resumeToastClearTimerRef.current = setTimeout(() => { resumeToastIdRef.current = null; resumeToastClearTimerRef.current = null; }, 4500);
                        } finally {
                            resumeToastPendingRef.current = false;
                        }
                    }
                } catch (e) { /* ignore */ }
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
    // Fuerza un salto inmediato al fondo (sin animación) cuando se abre una conversación
    const jumpToBottomImmediateRef = useRef(false);
    const chatMessagesRef = useRef([]);

    // Helper para deseleccionar con animación: agrega una clase al contenedor del área de chat
    // y espera al evento animationend o un timeout para limpiar y llamar a la callback (deseleccionar)
    const deselectWithAnimation = (cleanupCallback) => {
        const el = chatAreaRef.current;
        if (!el) {
            try { cleanupCallback && cleanupCallback(); } catch{}
            return;
        }
        // Añadir clase que dispara la animación CSS
        el.classList.add('chat-deselect-animate');
        // Escuchar fin de animación
        const onEnd = (e) => {
            // Ignorar si el evento viene de un elemento hijo
            if (e.target !== el) return;
            el.classList.remove('chat-deselect-animate');
            el.removeEventListener('animationend', onEnd);
            try { cleanupCallback && cleanupCallback(); } catch{}
        };
        el.addEventListener('animationend', onEnd);
        // Fallback: después de 500ms forzamos la limpieza
        setTimeout(() => {
            if (el.classList.contains('chat-deselect-animate')) {
                el.classList.remove('chat-deselect-animate');
                try { el.removeEventListener('animationend', onEnd); } catch {}
                try { cleanupCallback && cleanupCallback(); } catch{}
            }
        }, 520);
    };

    // Listener para gestionar auto-scroll inteligente: si el usuario se aleja del fondo, dejar de seguir hasta que vuelva.
    useEffect(() => {
        const el = chatAreaRef.current;
        if (!el) return;
        const handleScroll = () => {
            // Distancia desde el fondo
            const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
            // Si el usuario está a menos de 60px del fondo, activamos seguir al fondo
            if (distanceFromBottom < 60) {
                if (!stickToBottomRef.current) {
                    stickToBottomRef.current = true;
                }
            } else {
                // Usuario se alejó: desactivar seguimiento
                if (stickToBottomRef.current) {
                    stickToBottomRef.current = false;
                }
            }
        };
        el.addEventListener('scroll', handleScroll, { passive: true });
        // Ejecutar una vez para estado inicial
        handleScroll();
        return () => {
            try { el.removeEventListener('scroll', handleScroll); } catch {}
        };
    }, [selectedContact]);

    useLayoutEffect(() => {
        if (!selectedContact) return; // sin chat seleccionado, no movemos scroll
        const el = chatAreaRef.current;
        if (!el) return;
        if (pendingPrependRef.current) {
            const prevHeight = prevScrollHeightRef.current || 0;
            const prevTop = prevScrollTopRef.current || 0;
            const delta = el.scrollHeight - prevHeight;
            // Desactivar temporalmente scroll-behavior (smooth) para que el ajuste sea instantáneo
            // y no se vea un salto o animación al insertar mensajes arriba.
            const prevScrollBehavior = el.style.scrollBehavior;
            try {
                el.style.scrollBehavior = 'auto';
                el.scrollTop = delta + prevTop;
            } finally {
                // Restaurar el comportamiento de scroll en el siguiente frame.
                requestAnimationFrame(() => {
                    try { el.style.scrollBehavior = prevScrollBehavior || ''; } catch (e) {}
                });
            }
            pendingPrependRef.current = false;
            prevScrollHeightRef.current = 0;
            prevScrollTopRef.current = 0;
        } else if (jumpToBottomImmediateRef.current) {
            // Si acabamos de abrir la conversación, saltar inmediatamente al fondo (sin animación)
            try {
                const prevSB = el.style.scrollBehavior;
                el.style.scrollBehavior = 'auto';
                el.scrollTop = el.scrollHeight;
                requestAnimationFrame(() => { try { el.style.scrollBehavior = prevSB || ''; } catch(e){} });
            } catch (e) { /* fall back silencioso */ }
            jumpToBottomImmediateRef.current = false;
            shouldScrollToBottomRef.current = false;
        } else if (shouldScrollToBottomRef.current || stickToBottomRef.current) {
            try {
                if (typeof el.scrollTo === 'function') {
                    // prefer smooth scroll when intentionally scrolling to bottom
                    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
                } else {
                    const prevSB = el.style.scrollBehavior;
                    el.style.scrollBehavior = 'auto';
                    el.scrollTop = el.scrollHeight;
                    requestAnimationFrame(() => { try { el.style.scrollBehavior = prevSB || ''; } catch(e){} });
                }
            } catch (e) {
                el.scrollTop = el.scrollHeight;
            }
            shouldScrollToBottomRef.current = false;
        }
    }, [chatMessages, selectedContact]);

    // Mantener ref de mensajes para accesos en timers
    useEffect(() => { chatMessagesRef.current = chatMessages; }, [chatMessages]);

    // Mantener referencia de la conversación seleccionada para Realtime global
    const selectedConvIdRef = useRef(null);
    const photoInputRef = useRef(null);
    // Evitar procesar dos veces el mismo INSERT (a veces realtime puede entregar duplicados o múltiples listeners)
    const processedMessageIdsRef = useRef(new Set());

    useEffect(() => {
        selectedConvIdRef.current = selectedContact?.conversationId || null;
        console.log('Selected conversation id set to:', selectedConvIdRef.current);
    }, [selectedContact?.conversationId]);

    // Listener para enfocarse en conversación desde notificación
    useEffect(() => {
        const handler = (e) => {
            const convId = e?.detail?.conversationId;
            if (!convId) return;
            // Buscar conversación existente
            const conv = conversations.find(c => c.conversationId === convId);
            if (conv) {
                // Derivar contacto para selectContact: reuse mapping
                const contactsList = conversationsToContacts([conv]);
                if (contactsList[0]) {
                    handleSelectContact(contactsList[0]);
                }
            }
        };
        window.addEventListener('aguacatechat:focus-conversation', handler);
        return () => window.removeEventListener('aguacatechat:focus-conversation', handler);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversations]);

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
                        const msgIdKey = m.id != null ? String(m.id) : null;
                        if (!msgIdKey) {
                            console.warn('[realtime] INSERT sin id, se ignora incremento unread');
                        } else if (processedMessageIdsRef.current.has(msgIdKey)) {
                            // Ya procesado este mensaje
                            return;
                        } else {
                            processedMessageIdsRef.current.add(msgIdKey);
                            // Evitar crecimiento ilimitado
                            if (processedMessageIdsRef.current.size > 2000) {
                                const trimmed = new Set(Array.from(processedMessageIdsRef.current).slice(-1000));
                                processedMessageIdsRef.current = trimmed;
                            }
                        }
                        console.log('[realtime] INSERT messageId', msgIdKey, 'conv', m.conversation_id, 'selected', selectedConvIdRef.current);
                        let didIncrementUnread = false;
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
                                    else if (t === 'stories') {
                                        // Asegurar variable local para evitar ReferenceError
                                        let storyReply = null;
                                        // Intentar extraer metadata para mostrar un snippet más claro
                                        // Legacy prefix takes precedence if present
                                        if (typeof m.content === 'string' && m.content.startsWith('::storyreply::')) {
                                            try {
                                                const rest = m.content.substring('::storyreply::'.length);
                                                const sepIdx = rest.indexOf('::');
                                                if (sepIdx > -1) {
                                                    const metaStr = rest.slice(0, sepIdx);
                                                    const parsed = JSON.parse(metaStr);
                                                    const replyType = parsed.replyContentType || 'text';
                                                    if (replyType === 'image') label = 'Respuesta (imagen) a historia';
                                                    else if (replyType === 'video') label = 'Respuesta (video) a historia';
                                                    else if (replyType === 'audio') label = 'Respuesta (audio) a historia';
                                                    else label = 'Respuesta a historia';
                                                } else {
                                                    label = 'Respuesta a historia';
                                                }
                                            } catch {
                                                label = 'Respuesta a historia';
                                            }
                                        } else {
                                            // No legacy prefix: generic label for stories. We'll fetch story metadata later when chat is opened.
                                            label = 'Respuesta a historia';
                                        }
                                    }
                                    if (m.sender_id !== user?.id) {
                                        const isActive = m.conversation_id === selectedConvIdRef.current;
                                        if (!isActive && !didIncrementUnread) {
                                            const map = { ...(unreadRef.current || {}) };
                                            const prevVal = map[m.conversation_id] || 0;
                                            map[m.conversation_id] = prevVal + 1;
                                            unreadRef.current = map;
                                            saveUnreadToStorage(map);
                                            didIncrementUnread = true;
                                            console.log('[unread] inc conv', m.conversation_id, 'prev', prevVal, 'now', map[m.conversation_id]);
                                            // Sonido + notificación
                                            playNotificationSound(m.conversation_id);
                                            let snippet = label || '';
                                            if (typeof snippet === 'string' && snippet.length > 60) snippet = snippet.slice(0,57) + '…';
                                            const contactName = c?.otherProfile?.username || 'Nuevo mensaje';
                                            showBrowserNotification({ conversationId: m.conversation_id, contactName, body: snippet, isNewChat: prevVal === 0 });
                                        } else if (isActive && !document.hasFocus()) {
                                            // Chat abierto pero ventana no enfocada -> sonido único
                                            playNotificationSound(m.conversation_id);
                                        }
                                    }
                                    return {
                                        ...c,
                                        last_message: { id: m.id, content: m.content, sender_id: m.sender_id, type: t, seen: (typeof m.seen === 'string' ? m.seen : null) },
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
                        if (didIncrementUnread) {
                            // Rerender para reflejar unread actualizado en contactos derivados
                            forceUnreadRender(v => v + 1);
                        }

                        // a) Actualizar chat activo si coincide
                        if (m.conversation_id !== selectedConvIdRef.current) return;
                        setChatMessages((prev) => {
                            // Si es un mensaje propio, buscar un optimista tmp-* para reemplazar
                            if (m.sender_id === user?.id) {
                                let replaced = false;
                                const mapped = prev.map(msg => {
                                    if (!replaced && String(msg.id).startsWith('tmp-') && msg.type === 'sent' && msg.messageType === (m.type || 'text') && msg.text === (m.type === 'audio' ? '(Audio)' : msg.text)) {
                                        // Reemplazar primer candidato temporal (heurística básica)
                                        replaced = true;
                                        let storyReply = null; let cleanContent = m.content;
                                        try {
                                            if (m.type === 'stories') {
                                                // Legacy prefix fallback
                                                if (typeof m.content === 'string' && m.content.startsWith('::storyreply::')) {
                                                    const rest = m.content.substring('::storyreply::'.length);
                                                    const sepIdx = rest.indexOf('::');
                                                    if (sepIdx > -1) {
                                                        const metaStr = rest.slice(0, sepIdx);
                                                        storyReply = JSON.parse(metaStr);
                                                        cleanContent = rest.slice(sepIdx + 2);
                                                    }
                                                } else {
                                                    // Nuevo formato: buscar historia usando replyng_to/reply_to/replyTo
                                                    const storyId = m.replyng_to || m.reply_to || m.replyTo || null;
                                                    if (storyId) {
                                                        // fetchStoryMeta y aplicar cuando llegue
                                                        (async () => {
                                                            try {
                                                                const meta = await fetchStoryMeta(storyId, m.content, m.type);
                                                                if (meta) {
                                                                    const sr = { ...meta };
                                                                    // Forzar actualización del mensaje ya mapeado
                                                                    setChatMessages(cur => cur.map(mm => mm.id === m.id ? { ...mm, storyReply: sr } : mm));
                                                                }
                                                            } catch {}
                                                        })();
                                                    }
                                                }
                                            }
                                        } catch {}
                                        const base = {
                                            id: m.id,
                                            type: 'sent',
                                            created_at: m.created_at,
                                            messageType: m.type || 'text',
                                            seen: (typeof m.seen === 'string' ? m.seen : null),
                                            replyTo: msg.replyTo || m.replyng_to || m.reply_to || m.replyTo || null,
                                            storyReply,
                                        };
                                        if (m.type === 'audio') return { ...base, audioUrl: cleanContent, text: '(Audio)' };
                                        if (m.type === 'image') return { ...base, text: cleanContent };
                                        if (m.type === 'video') return { ...base, text: cleanContent };
                                        return { ...base, text: cleanContent };
                                    }
                                    return msg;
                                });
                                // Si no se pudo reemplazar (por timing), añadirlo al final evitando duplicados exactos
                                if (!replaced && !mapped.some(msg => msg.id === m.id)) {
                                    let storyReply = null; let cleanContent = m.content;
                                    try {
                                        if (m.type === 'stories') {
                                            // Legacy prefix
                                            if (typeof m.content === 'string' && m.content.startsWith('::storyreply::')) {
                                                const rest = m.content.substring('::storyreply::'.length);
                                                const sepIdx = rest.indexOf('::');
                                                if (sepIdx > -1) {
                                                    const metaStr = rest.slice(0, sepIdx);
                                                    storyReply = JSON.parse(metaStr);
                                                    cleanContent = rest.slice(sepIdx + 2);
                                                }
                                            } else {
                                                const storyId = m.replyng_to || m.reply_to || m.replyTo || null;
                                                if (storyId) {
                                                    (async () => {
                                                        try {
                                                            const meta = await fetchStoryMeta(storyId, m.content, m.type);
                                                            if (meta) {
                                                                storyReply = { ...meta };
                                                                setChatMessages(cur => cur.map(mm => mm.id === m.id ? { ...mm, storyReply } : mm));
                                                            }
                                                        } catch {}
                                                    })();
                                                }
                                            }
                                        }
                                    } catch {}
                                    const base = { id: m.id, type: 'sent', created_at: m.created_at, messageType: m.type || 'text', seen: (typeof m.seen === 'string' ? m.seen : null), replyTo: m.replyng_to || m.reply_to || m.replyTo || null, storyReply };
                                    if (m.type === 'audio') mapped.push({ ...base, audioUrl: cleanContent, text: '(Audio)' });
                                    else mapped.push({ ...base, text: cleanContent });
                                }
                                return mapped;
                            }
                            // Mensaje recibido normal (ignorar si está oculto localmente)
                            if (hiddenIdsRef.current.has(m.id)) return prev;
                            let storyReply = null; let cleanContent = m.content;
                            try {
                                if (m.type === 'stories') {
                                    // Legacy prefix
                                    if (typeof m.content === 'string' && m.content.startsWith('::storyreply::')) {
                                        const rest = m.content.substring('::storyreply::'.length);
                                        const sepIdx = rest.indexOf('::');
                                        if (sepIdx > -1) {
                                            const metaStr = rest.slice(0, sepIdx);
                                            storyReply = JSON.parse(metaStr);
                                            cleanContent = rest.slice(sepIdx + 2);
                                        }
                                    } else {
                                        const storyId = m.replyng_to || m.reply_to || m.replyTo || null;
                                        if (storyId) {
                                            (async () => {
                                                try {
                                                    const meta = await fetchStoryMeta(storyId, m.content, m.type);
                                                    if (meta) {
                                                        storyReply = { ...meta };
                                                        setChatMessages(cur => cur.map(mm => mm.id === m.id ? { ...mm, storyReply } : mm));
                                                    }
                                                } catch {}
                                            })();
                                        }
                                    }
                                }
                            } catch {}
                            const effectiveType = m.type || 'text';
                            const receivedBase = { id: m.id, type: 'received', created_at: m.created_at, messageType: effectiveType, seen: (typeof m.seen === 'string' ? m.seen : null), replyTo: m.replyng_to || m.reply_to || m.replyTo || null, storyReply };
                            if (effectiveType === 'audio') {
                                return [...prev, { ...receivedBase, audioUrl: cleanContent, text: '(Audio)' }];
                            }
                            return [...prev, { ...receivedBase, text: cleanContent }];
                        });
                    } else if (evt === 'UPDATE') {
                        const m = payload.new;
                        if (!m) return;
                        // Debug toast eliminado
                        // Helper para aplicar cambios a conversación (sidebar) si este mensaje es el último
                        const updateConversationSeen = (row) => {
                            setConversations(prev => prev.map(c => {
                                if (c.conversationId === row.conversation_id && c.last_message?.id === row.id) {
                                    return {
                                        ...c,
                                        last_message: {
                                            ...c.last_message,
                                            // Solo actualizamos campos que puedan haber cambiado
                                            type: row.type || c.last_message.type || 'text',
                                            content: row.content != null ? row.content : c.last_message.content,
                                            // `seen` is single user id or null
                                            seen: (typeof row.seen === 'string' ? row.seen : c.last_message.seen),
                                        }
                                    };
                                }
                                return c;
                            }));
                        };

                        const applyUpdate = (row) => {
                            // Actualizar conversaciones siempre (aunque el chat no esté abierto)
                            updateConversationSeen(row);
                            // Solo actualizar area de chat si es la conversación seleccionada
                            if (row.conversation_id !== selectedConvIdRef.current) return;
                            setChatMessages((prev) => prev.map((msg) => {
                                if (msg.id !== row.id) return msg;
                                const next = { ...msg };
                                if (typeof row.type === 'string') {
                                    next.messageType = row.type || 'text';
                                }
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
                                // `seen` is a single user id or null
                                if (typeof row.seen === 'string' || row.seen === null) next.seen = (typeof row.seen === 'string' ? row.seen : null);
                                if (row.reply_to != null && typeof next.replyTo === 'undefined') next.replyTo = row.reply_to;
                                return next;
                            }));
                        };

                        if (typeof m.seen === 'undefined' || m.seen === null) {
                            supabase
                                .from('messages')
                                .select('id, content, type, created_at, seen, conversation_id')
                                .eq('id', m.id)
                                .single()
                                .then(({ data, error }) => {
                                    if (error || !data) return;
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
    // Re-run this effect when privacy settings change so that toggling
    // `showLastConex` or `showStatus` takes effect immediately without
    // needing a full reload (it will update the profiles table).
    }, [user?.id, privacySettings]);

    // Suscripción focalizada a la conversación seleccionada: refuerza updates de 'seen'
    useEffect(() => {
        if (!user?.id || !selectedContact?.conversationId) return;
        const convId = selectedContact.conversationId;
        const channel = supabase
            .channel(`messages:conv:${convId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` },
                (payload) => {
                    const row = payload.new;
                    if (!row) return;
                    // Solo nos interesa cuando cambie 'seen'
                    if (typeof row.seen === 'undefined') return;
                    // Debug toast eliminado
                    setChatMessages(prev => prev.map(m => m.id === row.id ? { ...m, seen: (typeof row.seen === 'string' ? row.seen : m.seen) } : m));
                }
            )
            .subscribe();

        return () => { try { supabase.removeChannel(channel); } catch {} };
    }, [user?.id, selectedContact?.conversationId]);

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

    // Suscripción realtime para indicador de escritura de otros participantes
    useEffect(() => {
        if (!user?.id || !selectedContact?.conversationId) return;
        const convId = selectedContact.conversationId;
        // Al cambiar de conversación, reiniciar indicador local
        setIsTyping(false);
        const channel = supabase
            .channel(`participants:typing:${convId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'participants', filter: `conversation_id=eq.${convId}` }, (payload) => {
                const row = payload.new;
                if (!row) return;
                if (row.user_id === user.id) return; // ignorar self
                if (typeof row.isTyping !== 'undefined') {
                    setIsTyping(!!row.isTyping);
                }
            })
            .subscribe();
        return () => {
            // Al salir de la conversación actual, enviar false si seguíamos marcados
            if (selfTypingRef.current && user?.id) {
                updateTypingRemote(convId, user.id, false);
                selfTypingRef.current = false;
            }
            try { supabase.removeChannel(channel); } catch {}
        };
    }, [user?.id, selectedContact?.conversationId]);

    // Cleanup global on unmount
    useEffect(() => {
        return () => {
            if (selfTypingRef.current && user?.id && selectedContact?.conversationId) {
                updateTypingRemote(selectedContact.conversationId, user.id, false);
            }
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, []);

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
            const privacy = privacySettingsRef.current;
            const shouldBeOnline = !document.hidden && document.hasFocus();
            // Si ambas opciones están desactivadas, no publicamos nada nuevo.
            if (!privacy.showStatus && !privacy.showLastConex) return;
            try {
                const updateData = {};
                if (privacy.showStatus) updateData.isOnline = shouldBeOnline;
                if (!shouldBeOnline && privacy.showLastConex) updateData.lastConex = new Date().toISOString();
                if (Object.keys(updateData).length > 0) await updateTable('profiles', { id: user.id }, updateData);
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
    // También re-ejecutar cuando cambian las privacySettings para que el
    // `selectedContact` se actualice inmediatamente (por ejemplo al activar
    // "Mostrar Última Conexión").
    }, [conversations, selectedContact?.conversationId, privacySettings]);

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
    jumpToBottomImmediateRef.current = true; // forzar salto inmediato al fondo al iniciar la conversación
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
                        const replyNormalized = m.replyng_to || m.reply_to || m.replyTo || null;
                        let storyReply = null; let cleanContent = m.content;
                        if (m.type === 'stories') {
                            // Legacy prefix
                            if (typeof m.content === 'string' && m.content.startsWith('::storyreply::')) {
                                try {
                                    const rest = m.content.substring('::storyreply::'.length);
                                    const sepIdx = rest.indexOf('::');
                                    if (sepIdx > -1) {
                                        const metaStr = rest.slice(0, sepIdx);
                                        storyReply = JSON.parse(metaStr);
                                        cleanContent = rest.slice(sepIdx + 2);
                                    }
                                } catch {}
                            } else {
                                const storyId = m.replyng_to || m.reply_to || m.replyTo || null;
                                if (storyId) {
                                    (async () => {
                                        try {
                                            const meta = await fetchStoryMeta(storyId, m.content, m.type);
                                            if (meta) setChatMessages(cur => cur.map(mm => mm.id === m.id ? { ...mm, storyReply: meta } : mm));
                                        } catch {}
                                    })();
                                }
                            }
                        }
                        const effectiveInner = m.type || 'text';
                        const base = {
                            id: m.id,
                            type: m.sender_id === user?.id ? 'sent' : 'received',
                            created_at: m.created_at,
                            messageType: effectiveInner,
                            seen: (typeof m.seen === 'string' ? m.seen : null),
                            replyTo: replyNormalized,
                            storyReply,
                        };
                        if (m.type === 'audio') return { ...base, audioUrl: cleanContent, text: '(Audio)' };
                        if (m.type === 'image') return { ...base, text: cleanContent };
                        if (m.type === 'video') return { ...base, text: cleanContent };
                        return { ...base, text: cleanContent };
                    });
                    setChatMessages(mapped.filter(m => !hiddenIdsRef.current.has(m.id)));
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
                const replyNormalized = m.replyng_to || m.reply_to || m.replyTo || null;
                let storyReply = null; let cleanContent = m.content;
                if (m.type === 'stories') {
                    // Legacy prefix
                    if (typeof m.content === 'string' && m.content.startsWith('::storyreply::')) {
                        try {
                            const rest = m.content.substring('::storyreply::'.length);
                            const sepIdx = rest.indexOf('::');
                            if (sepIdx > -1) {
                                const metaStr = rest.slice(0, sepIdx);
                                storyReply = JSON.parse(metaStr);
                                cleanContent = rest.slice(sepIdx + 2);
                            }
                        } catch {}
                    } else {
                        const storyId = m.replyng_to || m.reply_to || m.replyTo || null;
                        if (storyId) {
                            (async () => {
                                try {
                                    const meta = await fetchStoryMeta(storyId, m.content, m.type);
                                    if (meta) setChatMessages(cur => cur.map(mm => mm.id === m.id ? { ...mm, storyReply: meta } : mm));
                                } catch {}
                            })();
                        }
                    }
                }
                const effectiveInner = m.type || 'text';
                const base = {
                    id: m.id,
                    type: m.sender_id === user?.id ? 'sent' : 'received',
                    created_at: m.created_at,
                    messageType: effectiveInner,
                    seen: (typeof m.seen === 'string' ? m.seen : null),
                    replyTo: replyNormalized,
                    storyReply,
                };
                if (m.type === 'audio') return { ...base, audioUrl: cleanContent, text: '(Audio)' };
                return { ...base, text: cleanContent };
            });
            setChatMessages(prev => [...mapped.filter(m => !hiddenIdsRef.current.has(m.id)), ...prev]);
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
            if (!privacySettingsRef.current.readReceipts) return
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
                // `seen` is single user id or null
                const alreadySeen = (typeof msg.seen === 'string' && String(msg.seen) === String(user.id));
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
                        // Set seen to the single user id
                        setChatMessages(prev => prev.map(m => m.id === u.id ? { ...m, seen: user.id } : m))
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
    // Estado para respuesta a un mensaje
    const [replyToMessage, setReplyToMessage] = useState(null); // {id, text, messageType}

    // Enfocar y seleccionar el input de mensaje al cambiar de conversación
    useEffect(() => {
        try {
            if (selectedContact && messageInputRef?.current) {
                const el = messageInputRef.current;
                if (typeof el.focus === 'function') el.focus();
                try { if (typeof el.select === 'function') el.select(); } catch (e) {}
            }
        } catch (e) {}
    }, [selectedContact?.conversationId]);

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
        // Detectar la posición del scroll para decidir comportamiento al enviar
        let wasAtBottom = false;
        let wasFarFromBottom = false;
        try {
            const el = chatAreaRef.current;
            if (el) {
                const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
                wasAtBottom = distance < 60; // tolerancia para considerar "al fondo"
                // Si el usuario está muy arriba (ej. >300px del fondo) forzamos transporte al final
                wasFarFromBottom = distance > 300;
            }
        } catch {}
        const tempId = `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const optimistic = { id: tempId, type: 'sent', text: content, created_at: new Date().toISOString(), messageType: 'text', replyTo: replyToMessage ? replyToMessage.id : null };
        setChatMessages(prev => [...prev, optimistic]);
        // Si estaba al fondo, seguir con scroll suave. Si estaba muy arriba, forzar salto inmediato
        if (wasAtBottom) {
            shouldScrollToBottomRef.current = true;
            stickToBottomRef.current = true; // continuar siguiendo
        } else if (wasFarFromBottom) {
            // Forzar salto inmediato al final para que el autor vea su propio mensaje
            shouldScrollToBottomRef.current = true;
            jumpToBottomImmediateRef.current = true;
            stickToBottomRef.current = true;
        }
        setMessageInput('');
        setReplyToMessage(null);
        // Al enviar mensaje, marcar typing false inmediatamente
        stopTypingImmediate();
        // Restablecer altura del textarea al tamaño base
        if (messageInputRef.current) {
            messageInputRef.current.style.height = '44px';
            // Forzar reflow opcional si fuera necesario
        }
        try {
            await insertMessage({ conversationId: selectedContact.conversationId, senderId: user?.id, content, replyng_to: replyToMessage ? replyToMessage.id : null });
        } catch (e) {
            console.error('Error enviando mensaje:', e);
            toast.error('No se pudo enviar el mensaje');
            // opcional: revertir optimismo o marcar como fallido
        }
    };

    // Handler de cambio del textarea para enviar indicador de typing
    const handleMessageInputChange = (e) => {
        const val = e.target.value;
        setMessageInput(val);
        triggerTyping();
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
            setChatMessages(prev => [...prev, { id: tempId, type: 'sent', text: localPreviewUrl, created_at: new Date().toISOString(), messageType: 'image', replyTo: replyToMessage ? replyToMessage.id : null }]);
            // Comportamiento de scroll al enviar desde posición alta
            try {
                const el = chatAreaRef.current;
                if (el) {
                    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
                    if (distance > 300) {
                        shouldScrollToBottomRef.current = true;
                        jumpToBottomImmediateRef.current = true;
                        stickToBottomRef.current = true;
                    } else if (distance < 60) {
                        shouldScrollToBottomRef.current = true;
                        stickToBottomRef.current = true;
                    }
                }
            } catch {}

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
                type: 'image',
                replyTo: replyToMessage ? replyToMessage.id : null
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
            setChatMessages(prev => [...prev, { id: tempId, type: 'sent', text: localUrl, created_at: new Date().toISOString(), messageType: 'video', uploading: true, replyTo: replyToMessage ? replyToMessage.id : null }]);
            // Comportamiento de scroll al enviar desde posición alta
            try {
                const el = chatAreaRef.current;
                if (el) {
                    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
                    if (distance > 300) {
                        shouldScrollToBottomRef.current = true;
                        jumpToBottomImmediateRef.current = true;
                        stickToBottomRef.current = true;
                    } else if (distance < 60) {
                        shouldScrollToBottomRef.current = true;
                        stickToBottomRef.current = true;
                    }
                }
            } catch {}

            // Subir al bucket
            const { uploadVideoToBucket } = await import('./services/db');
            const { publicUrl } = await uploadVideoToBucket({ file, conversationId: selectedContact.conversationId, userId: user?.id });

            await insertMessage({
                conversationId: selectedContact.conversationId,
                senderId: user?.id,
                content: publicUrl,
                type: 'video',
                replyTo: replyToMessage ? replyToMessage.id : null
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
    // Debug: exponer contactos en window para inspección rápida en consola
    React.useEffect(() => {
        try {
            // No bloquear producción si window no existe
            if (typeof window !== 'undefined') {
                window.__AG_CONTACTS__ = contacts || [];
                window.__AG_FILTERED_CONTACTS__ = filteredContacts || [];
            }
        } catch (e) {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contacts]);

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
                const seenId = (typeof m?.seen === 'string') ? m.seen : null;
                if (seenId && String(seenId) === String(otherUserId)) return i;
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
        if (!privacySettingsRef.current.readReceipts) return -1;
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
                    const incomingSeen = (typeof r.seen === 'string' ? r.seen : m.seen);
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
                        const replyNormalized = m.replyng_to || m.reply_to || m.replyTo || null;
                        const base = { id: m.id, type: m.sender_id === user?.id ? 'sent' : 'received', created_at: m.created_at, messageType: m.type || 'text', seen: (typeof m.seen === 'string' ? m.seen : null), replyTo: replyNormalized };
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
        if (contact?.conversationId) {
            const map = { ...(unreadRef.current || {}) };
            if (map[contact.conversationId]) {
                map[contact.conversationId] = 0;
                unreadRef.current = map;
                saveUnreadToStorage(map);
                forceUnreadRender(v => v + 1);
            }
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
                // Buscar por username O email (coincidencias parciales, insensible a mayúsculas)
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, username, avatar_url, email')
                    .or(`username.ilike.%${q}%,email.ilike.%${q}%`)
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

    // ---------------- Eliminación / ocultar mensaje ----------------
    const [showDeleteMessageModal, setShowDeleteMessageModal] = useState(false);
    const [deleteTargetMessage, setDeleteTargetMessage] = useState(null); // { id, isOwn }
    const [hiddenMessageIdsVersion, setHiddenMessageIdsVersion] = useState(0); // para forzar renders tras ocultar
    const hiddenIdsRef = useRef(new Set());
    const HIDDEN_KEY_PREFIX = 'aguacatechat:hiddenMessages:';
    const storageHiddenKey = (conversationId, userId) => `${HIDDEN_KEY_PREFIX}${userId || 'anon'}:${conversationId || 'none'}`;
    const loadHiddenIds = (conversationId, userId) => {
        if (!conversationId || !userId) { hiddenIdsRef.current = new Set(); return; }
        try {
            const raw = localStorage.getItem(storageHiddenKey(conversationId, userId));
            const arr = raw ? JSON.parse(raw) : [];
            hiddenIdsRef.current = Array.isArray(arr) ? new Set(arr) : new Set();
        } catch { hiddenIdsRef.current = new Set(); }
    };
    const persistHiddenIds = (conversationId, userId) => {
        if (!conversationId || !userId) return;
        try { localStorage.setItem(storageHiddenKey(conversationId, userId), JSON.stringify(Array.from(hiddenIdsRef.current))); } catch {}
    };
    useEffect(() => {
        if (selectedContact?.conversationId && user?.id) {
            loadHiddenIds(selectedContact.conversationId, user.id);
            setHiddenMessageIdsVersion(v => v + 1);
        } else {
            hiddenIdsRef.current = new Set();
            setHiddenMessageIdsVersion(v => v + 1);
        }
    }, [selectedContact?.conversationId, user?.id]);
    const openDeleteMessageModal = (message, isOwn) => {
        if (!message?.id) return;
        setDeleteTargetMessage({ id: message.id, isOwn });
        setShowDeleteMessageModal(true);
    };
    const handleHideMessageLocally = (messageId) => {
        if (!messageId) return;
        hiddenIdsRef.current.add(messageId);
        persistHiddenIds(selectedContact?.conversationId, user?.id);
        setChatMessages(prev => prev.filter(m => m.id !== messageId));
        setHiddenMessageIdsVersion(v => v + 1);
    };
    const handleDeleteForAll = async (messageId) => {
        if (!messageId) return;
        try {
            await deleteMessageById(messageId);
            // Optimista (realtime también disparará DELETE)
            setChatMessages(prev => prev.filter(m => m.id !== messageId));
            toast.success('Mensaje eliminado para todos');
        } catch (e) {
            console.error('Error al eliminar para todos:', e);
            toast.error('No se pudo eliminar');
        }
    };

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
                    // Deseleccionar chat con animación y limpiar UI relacionada
                    deselectWithAnimation(() => {
                        setSelectedContact(null);
                        setChatMessages([]);
                        setShowChatOptionsMenu(false);
                        setShowAttachMenu(false);
                    });
                }
                if (replyToMessage) setReplyToMessage(null);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [selectedContact, replyToMessage]);

    const [messageMenuOpenId, setMessageMenuOpenId] = useState(null);
    // Tipo de mensaje cuyo menú está abierto: 'own' | 'received'
    const [messageMenuType, setMessageMenuType] = useState(null);
    const messageMenuRef = useRef(null);

    useEffect(() => {
            function handleClickOutside(event) {
                if (messageMenuRef.current && !messageMenuRef.current.contains(event.target)) {
                    setMessageMenuOpenId(null);
                    setMessageMenuType(null);
                }
            }
            function handleEsc(e){
                if(e.key === 'Escape'){
                    setMessageMenuOpenId(null);
                    setMessageMenuType(null);
                }
            }
            if (messageMenuOpenId !== null) {
                document.addEventListener("mousedown", handleClickOutside);
                document.addEventListener('keydown', handleEsc);
            }
            return () => {
                document.removeEventListener("mousedown", handleClickOutside);
                document.removeEventListener('keydown', handleEsc);
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
        let t = null;
        let raf = null;
        // Cuando termina la carga del área de chat, asegurarnos de que el scroll esté abajo
        if (!loadingChatArea && showChatSkeleton && !chatSkeletonExiting) {
            // Marcar salida de skeleton (animación), pero primero forzamos scroll al fondo
            const el = chatAreaRef.current;
            const ensureScrolledAndHide = () => {
                if (!el) {
                    setChatSkeletonExiting(true);
                    setTimeout(() => {
                        setShowChatSkeleton(false);
                        setChatSkeletonExiting(false);
                    }, 240);
                    return;
                }

                const maxTimeout = 4000; // max espera 4s
                const stableThreshold = 300; // ms sin cambios para considerar estable
                const pollInterval = 120; // ms
                let resolved = false;
                let observers = [];
                let imgListeners = [];
                let intervalId = null;
                let timeoutId = null;

                const cleanupAll = () => {
                    observers.forEach(o => { try { o.disconnect(); } catch(e){} });
                    observers = [];
                    imgListeners.forEach(({img, handler}) => { try { img.removeEventListener('load', handler); img.removeEventListener('error', handler); } catch(e){} });
                    imgListeners = [];
                    if (intervalId) { clearInterval(intervalId); intervalId = null; }
                    if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
                };

                const tryResolve = () => {
                    if (resolved) return;
                    resolved = true;
                    cleanupAll();
                    // iniciar animación de salida
                    setChatSkeletonExiting(true);
                    setTimeout(() => {
                        setShowChatSkeleton(false);
                        setChatSkeletonExiting(false);
                    }, 240);
                };

                // Scroll inmediato al fondo (forzar sin smooth para evitar animación inesperada)
                try {
                    const prevSB = el.style.scrollBehavior;
                    el.style.scrollBehavior = 'auto';
                    el.scrollTop = el.scrollHeight;
                    requestAnimationFrame(() => { try { el.style.scrollBehavior = prevSB || ''; } catch(e){} });
                } catch (e) {}

                let lastHeight = el.scrollHeight;
                let lastChangeAt = Date.now();

                // Observador de mutaciones en el contenedor
                try {
                    const mo = new MutationObserver((mutations) => {
                        lastHeight = el.scrollHeight;
                        lastChangeAt = Date.now();
                    });
                    mo.observe(el, { childList: true, subtree: true, attributes: true, characterData: true });
                    observers.push(mo);
                } catch (e) {}

                // Escuchar cargas de imágenes no completadas
                try {
                    const imgs = Array.from(el.querySelectorAll('img'));
                    imgs.forEach((img) => {
                        if (!img.complete) {
                            const handler = () => { lastHeight = el.scrollHeight; lastChangeAt = Date.now(); };
                            img.addEventListener('load', handler);
                            img.addEventListener('error', handler);
                            imgListeners.push({img, handler});
                        }
                    });
                } catch (e) {}

                // Intervalo que intenta scrollear y comprueba estabilidad
                intervalId = setInterval(() => {
                    try {
                        // intentar mantener abajo; forzar sin smooth si no hay scrollTo
                        if (typeof el.scrollTo === 'function') {
                            el.scrollTo({ top: el.scrollHeight });
                        } else {
                            const prevSB = el.style.scrollBehavior;
                            el.style.scrollBehavior = 'auto';
                            el.scrollTop = el.scrollHeight;
                            requestAnimationFrame(() => { try { el.style.scrollBehavior = prevSB || ''; } catch(e){} });
                        }
                    } catch (e) {}
                    const now = Date.now();
                    const currentHeight = el.scrollHeight;
                    const atBottom = Math.abs((el.scrollTop + el.clientHeight) - el.scrollHeight) <= 2;
                    if (currentHeight !== lastHeight) {
                        lastHeight = currentHeight;
                        lastChangeAt = now;
                        return; // esperamos a que se estabilice
                    }
                    // si llevamos tiempo estables y estamos al bottom, resolvemos
                    if ((now - lastChangeAt) >= stableThreshold && atBottom) {
                        tryResolve();
                    }
                }, pollInterval);

                // timeout por si algo no converge
                timeoutId = setTimeout(() => {
                    tryResolve();
                }, maxTimeout);
            };
            ensureScrolledAndHide();
        }
        if (loadingChatArea && !showChatSkeleton) {
            setShowChatSkeleton(true);
            setChatSkeletonExiting(false);
        }
        return () => {};
    }, [loadingChatArea, showChatSkeleton, chatSkeletonExiting]);

    // Nota: en vez de hacer early return, mostraremos un overlay mientras carga para permitir el fade-out sobre el contenido ya montado.

    // --- UX móvil: si estamos en móvil y NO hay contacto seleccionado, asegurar que la barra de contactos esté visible ---
    useEffect(() => {
        if (isMobile && !selectedContact) {
            // Garantizar que la barra (lista de chats) no esté cerrada manualmente
            setIsSidebarOpen(true);
        }
    }, [isMobile, selectedContact]);

    const isFullScreenContacts = isMobile && !selectedContact; // estado full screen para móvil sin chat

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Componente para mostrar las notificaciones */}
            <Toaster position="top-center" reverseOrder={false} limit={3} />

            {/* Sidebar compacto (iconos verticales). En móvil se oculta visualmente cuando hay un chat seleccionado
                o cuando la vista actual es 'stories' (usando compactInvisible). Importante: siempre montamos el componente
                para que su menú extendido (overlay) pueda mostrarse desde cualquier vista cuando showSideMenu === true. */}
            {!(isMobile && selectedContact) && (
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
                    // Cuando estamos en mobile y la vista es stories, hacemos invisible la barra compacta
                    // pero dejamos montado el componente para permitir abrir el overlay desde Stories
                    compactInvisible={isMobile && (currentView === 'stories' || !selectedContact)}
                />
            )}
            {/* Sidebar de contactos e Historias: se oculta en móvil si hay un chat seleccionado */}
            {!(isMobile && selectedContact) && (
                currentView === 'chats' ? (
                    loadingChatsSidebar ? (
                        <SidebarSkeleton />
                    ) : (
                    <div
                        id="sidebar"
                        className={`sidebar theme-bg-secondary theme-border flex flex-col h-full 
                            ${isFullScreenContacts
                                ? 'w-full inset-0 absolute z-30 border-0'
                                : 'w-80 md:relative absolute z-20 border-r'}
                            ${isSidebarOpen ? 'open' : ''}`}
                    >
                        <div className="p-4 theme-border border-b">
                            <div className="flex items-center justify-between mb-4">
                                <h1 className="text-xl font-bold theme-text-primary">AguacaChat</h1>
                                <div className="flex items-center gap-2">
                                    {/* Botón móvil para abrir el menú extendido (misma función que el primer botón de la barra lateral) */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            try { console.log('[AguacateChat] Click botón móvil menú (abrir ExtendedMenu)'); } catch {}
                                            setShowSideMenu(true);
                                        }}
                                        className="md:hidden p-2 rounded-lg theme-bg-chat hover:opacity-80 transition focus:outline-none focus:ring-2 focus:ring-teal-primary flex items-center justify-center"
                                        aria-label="Abrir menú"
                                        title="Abrir menú"
                                    >
                                        <svg viewBox="0 0 48 48" width="24" height="24" className="stroke-current" preserveAspectRatio="xMidYMid slice">
                                            <g transform="translate(9,12.5)">
                                                <path d="M1 1 H29" strokeWidth="2" strokeLinecap="round" className="theme-text-primary" />
                                                <path d="M1 11.5 H29" strokeWidth="2" strokeLinecap="round" className="theme-text-primary" />
                                                <path d="M1 22 H29" strokeWidth="2" strokeLinecap="round" className="theme-text-primary" />
                                            </g>
                                        </svg>
                                    </button>
                                    {!isFullScreenContacts && (
                                        <button className="md:hidden p-2 rounded-lg theme-bg-chat" onClick={toggleSidebar}>
                                        ✕
                                        </button>
                                    )}
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
                                                            <p className={`font-semibold truncate ${isDarkMode ? 'text-white' : 'text-gray-800'} flex items-center gap-2`}> 
                                                                <span className="truncate">{contact.name}</span>
                                                                {isConversationMuted(contact.conversationId) && (
                                                                    <svg className="w-4 h-4 opacity-80 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                                        <path d="M13.73 21a2 2 0 01-3.46 0" />
                                                                        <path d="M18.63 13A17.89 17.89 0 0118 8" />
                                                                        <path d="M6.88 6.88A6 6 0 0112 4v0a6 6 0 016 6v3l1 1H5l1-1V12a6 6 0 01.88-2.12" />
                                                                        <line x1="1" y1="1" x2="23" y2="23" />
                                                                    </svg>
                                                                )}
                                                            </p>
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
                                                                            <>
                                                                                {contact.lastMessage}
                                                                                {contact.lastMessageSeen && (
                                                                                    <span className="ml-2 inline-flex items-center flex-shrink-0" title="Visto">
                                                                                        {contact.avatar_url ? (
                                                                                            <img src={contact.avatar_url} alt="Visto" className="w-4 h-4 rounded-full object-cover" onError={(e)=>{ e.currentTarget.style.display = 'none'; }} />
                                                                                        ) : (
                                                                                            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-teal-primary to-teal-secondary flex items-center justify-center text-white text-[10px] font-bold">
                                                                                                {String(contact.initials || '').slice(0,2) || '•'}
                                                                                            </div>
                                                                                        )}
                                                                                    </span>
                                                                                )}
                                                                            </>
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
                                                <p className={`font-semibold truncate ${isDarkMode ? 'text-white' : 'text-gray-800'} flex items-center gap-2`}>
                                                    <span className="truncate">{contact.name}</span>
                                                    {isConversationMuted(contact.conversationId) && (
                                                        <svg className="w-4 h-4 opacity-80 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                            <path d="M13.73 21a2 2 0 01-3.46 0" />
                                                            <path d="M18.63 13A17.89 17.89 0 0118 8" />
                                                            <path d="M6.88 6.88A6 6 0 0112 4v0a6 6 0 016 6v3l1 1H5l1-1V12a6 6 0 01.88-2.12" />
                                                            <line x1="1" y1="1" x2="23" y2="23" />
                                                        </svg>
                                                    )}
                                                </p>
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
                                                            <>
                                                                {contact.lastMessage}
                                                                {contact.lastMessageSeen && (
                                                                    <span className="ml-2 inline-flex items-center flex-shrink-0" title="Visto">
                                                                        {contact.avatar_url ? (
                                                                            <img src={contact.avatar_url} alt="Visto" className="w-4 h-4 rounded-full object-cover" onError={(e)=>{ e.currentTarget.style.display = 'none'; }} />
                                                                        ) : (
                                                                            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-teal-primary to-teal-secondary flex items-center justify-center text-white text-[10px] font-bold">
                                                                                {String(contact.initials || '').slice(0,2) || '•'}
                                                                            </div>
                                                                        )}
                                                                    </span>
                                                                )}
                                                            </>
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
                                        onClick={createNewChat}
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
                    <div className="w-full md:w-80 theme-bg-secondary theme-border md:border-r flex flex-col h-full">
                        {loadingStories ? <StoriesSkeleton /> : <StoriesView ref={storiesViewRef} onOpenSidebar={() => setShowSideMenu(true)} />}
                    </div>
                )
            )}

            {/* Área principal del chat. En móvil, ocupa toda la pantalla si hay un chat seleccionado. */}
            <div className={`flex-1 flex-col relative ${isMobile && selectedContact ? 'w-full h-full' : (isMobile ? 'hidden' : 'flex')}`}>
                {/* Header del área principal: solo cuando hay chat seleccionado */}
                {selectedContact && (
                        <div className="theme-bg-secondary theme-border border-b p-3 sm:p-4 flex items-center gap-2 sm:gap-4 min-h-[64px] sm:min-h-[72px]">
                            {/* Botón hamburguesa movido al extremo izquierdo */}
                            <div className="flex items-center -ml-2 sm:-ml-1">
                                <button
                                    className="md:hidden p-1 sm:p-1.8 rounded-lg theme-bg-chat h-10 w-10 flex items-center justify-center"
                                    onClick={() => { toggleSidebar(); deselectWithAnimation(() => { setSelectedContact(null); setChatMessages([]); }); }}
                                    aria-label="Volver atrás"
                                >
                                    {/* Arrow back SVG - reducido ligeramente */}
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                        <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L6.414 9H17a1 1 0 110 2H6.414l3.293 3.293a1 1 0 010 1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                            <div
                                className="flex items-center gap-2 sm:gap-3 cursor-pointer group rounded-lg px-1 -mx-1 ml-0 sm:ml-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-primary/60 transition-colors"
                                onClick={() => {
                                    setShowProfileModal(true);
                                    if (import.meta.env?.DEV) {
                                        console.debug('[AguacateChat] Abriendo modal contacto selectedContact.profileInformation=', selectedContact.profileInformation);
                                    }
                                    setContactProfileData({
                                        // Usar el id real del perfil (profileId) en lugar de selectedContact.id (no definido)
                                        id: selectedContact.profileId,
                                        name: selectedContact.name,
                                        username: selectedContact.username,
                                        initials: selectedContact.initials || (selectedContact.name ? selectedContact.name.slice(0,2).toUpperCase() : 'CN'),
                                        avatar_url: selectedContact.avatar_url,
                                        profileInformation: selectedContact.profileInformation
                                    });
                                }}
                                role="button"
                                tabIndex={0}
                                aria-label={`Ver perfil de ${selectedContact.name}`}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }}
                                title="Ver perfil del contacto"
                            >
                                <div className="relative">
                                    {selectedContact?.avatar_url ? (
                                        <img
                                            src={selectedContact.avatar_url}
                                            alt={selectedContact.name}
                                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover ring-0 group-hover:ring-2 ring-teal-primary/60 transition-all"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-teal-primary to-teal-secondary rounded-full flex items-center justify-center ring-0 group-hover:ring-2 ring-offset-0 ring-teal-primary/60 transition-all">
                                            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
                                            </svg>
                                        </div>
                                    )}
                                    <div className="absolute -bottom-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-1 py-0.5 rounded bg-teal-primary text-white shadow">
                                        Ver
                                    </div>
                                </div>
                                <div className="flex flex-col leading-tight">
                                    <h2 id="chatName" className="font-semibold theme-text-primary flex items-center gap-1 text-sm sm:text-base">
                                        {selectedContact.name}
                                        <svg className="w-3.5 h-3.5 opacity-0 group-hover:opacity-80 transition-opacity" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path d="M10.78 2.22a.75.75 0 00-1.06 0L4.97 6.97a.75.75 0 101.06 1.06L10 4.06l3.97 3.97a.75.75 0 101.06-1.06l-4.25-4.75z" />
                                            <path d="M4.22 12.22a.75.75 0 011.06 0L10 16.94l4.72-4.72a.75.75 0 111.06 1.06l-5.25 5.25a.75.75 0 01-1.06 0l-5.25-5.25a.75.75 0 010-1.06z" />
                                        </svg>
                                    </h2>
                                    <p id="chatStatus" className="text-xs sm:text-sm theme-text-secondary group-hover:text-teal-primary transition-colors">
                                        {isTyping
                                            ? 'Escribiendo...'
                                            : selectedContact.status === '🟢'
                                                ? 'En línea'
                                                : selectedContact.status === '🟡'
                                                    ? 'Ausente'
                                                    : selectedContact.status}
                                    </p>
                                </div>
                        </div>
                        <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
                            <div className="relative">
                                <button
                                    onClick={toggleChatOptions}
                                    className={`p-1.5 sm:p-2 rounded-lg theme-bg-chat transition-opacity flex flex-col gap-0.5 sm:gap-1 items-center justify-center w-9 h-9 sm:w-10 sm:h-10 ${(!selectedContact || isConvBlocked) ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
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
                                    <button onClick={() => { toggleMuteConversation(selectedContact?.conversationId); toggleChatOptions(); }} className="w-full text-left p-3 hover:theme-bg-secondary theme-text-primary rounded-t-lg transition-colors flex items-center gap-2"
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
                                        <span>{isConversationMuted(selectedContact?.conversationId) ? 'Activar notificaciones' : 'Silenciar notificaciones'}</span>
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
                                </div>
                            </div>
                            
                        </div>
                    </div>
                )}

                <ChatArea
                    currentView={currentView}
                    selectedContact={selectedContact}
                    loadingChatArea={loadingChatArea}
                    isConvBlocked={isConvBlocked}
                    isConversationAccepted={isConversationAccepted}
                    isConversationCreator={isConversationCreator}
                    chatMessages={chatMessages}
                    isAcceptingConv={isAcceptingConv}
                    isRejectingConv={isRejectingConv}
                    acceptConversation={acceptConversation}
                    rejectConversation={rejectConversation}
                    hasMoreOlder={hasMoreOlder}
                    loadingOlder={loadingOlder}
                    loadOlderMessages={loadOlderMessages}
                    chatAreaRef={chatAreaRef}
                    tryMarkVisibleAsSeen={tryMarkVisibleAsSeen}
                    recalcReadReceiptPosition={recalcReadReceiptPosition}
                    personalization={personalization}
                    isDarkMode={isDarkMode}
                    setMediaGalleryOpen={setMediaGalleryOpen}
                    setMediaGalleryIndex={setMediaGalleryIndex}
                    openDeleteMessageModal={openDeleteMessageModal}
                    messageMenuOpenId={messageMenuOpenId}
                    messageMenuType={messageMenuType}
                    setMessageMenuOpenId={setMessageMenuOpenId}
                    setMessageMenuType={setMessageMenuType}
                    setReplyToMessage={(payload) => {
                        try {
                            setReplyToMessage(payload);
                        } catch (e) {
                            try { setReplyToMessage(payload); } catch {}
                        }
                        // Focus & select the message input when replying
                        try {
                            const el = messageInputRef?.current;
                            if (el) {
                                // some inputs are textarea or contenteditable-like; attempt focus and select
                                if (typeof el.focus === 'function') el.focus();
                                if (typeof el.select === 'function') el.select();
                                // for non-standard elements try selecting via setSelectionRange when possible
                                try {
                                    if (el.setSelectionRange && typeof el.value === 'string') {
                                        el.setSelectionRange(el.value.length, el.value.length);
                                    }
                                } catch (err) {}
                            }
                        } catch (err) {}
                    }}
                    blockedBy={blockedBy}
                    handleToggleConversationBlocked={handleToggleConversationBlocked}
                    isTogglingBlocked={isTogglingBlocked}
                    readReceiptTop={readReceiptTop}
                    animateReadReceipt={animateReadReceipt}
                    isTyping={isTyping}
                    isCreatorSendingLocked={isCreatorSendingLocked}
                    user={user}
                />

                {selectedContact && !isConvBlocked && (
                <div className="theme-bg-secondary theme-border border-t p-3 sm:p-4">
                    <div className="flex items-center gap-2 sm:gap-3 w-full mx-auto px-1 sm:px-0">
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
                            className="p-1 rounded-lg theme-bg-chat hover:opacity-80 transition-opacity shrink-0" 
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
                                        {/* Bloque ayuda adjuntos */}
                                        <div className="mb-4">
                                            <button
                                                type="button"
                                                onClick={() => setShowAttachHelp(h => !h)}
                                                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl theme-border border theme-bg-chat hover:bg-teal-600/10 transition-colors group"
                                                aria-expanded={showAttachHelp}
                                            >
                                                <span className="flex items-center gap-2 text-sm font-medium tracking-wide theme-text-primary">
                                                    <svg className={`w-4 h-4 transition-transform ${showAttachHelp ? 'rotate-90' : ''}`} stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                                        <path d="M9 18l6-6-6-6" />
                                                    </svg>
                                                    Cómo usar este selector
                                                </span>
                                                <span className="text-[11px] uppercase tracking-wide font-semibold px-2 py-1 rounded-md bg-teal-500/15 text-teal-300 group-hover:bg-teal-500/25 transition-colors">{showAttachHelp ? 'Ocultar' : 'Ayuda'}</span>
                                            </button>
                                            {showAttachHelp && (
                                                <div className="mt-3 px-4 py-4 rounded-xl bg-gradient-to-br from-slate-900/70 via-slate-900/60 to-slate-950/70 border border-white/10 shadow-inner text-[13px] leading-relaxed space-y-3 animate-[fadeIn_.35s_ease]">
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-6 h-6 rounded-lg bg-teal-500/15 text-teal-300 flex items-center justify-center text-xs font-bold">1</div>
                                                        <p><strong className="text-teal-300 font-semibold">Pulsa "Ver más"</strong> para abrir tu explorador y elegir <span className="text-teal-200">imágenes o videos</span>.</p>
                                                    </div>
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-6 h-6 rounded-lg bg-teal-500/15 text-teal-300 flex items-center justify-center text-xs font-bold">2</div>
                                                        <p><strong className="text-teal-300 font-semibold">Haz clic</strong> en una miniatura reciente para <span className="text-teal-200">enviarla directamente</span> al chat.</p>
                                                    </div>
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-6 h-6 rounded-lg bg-teal-500/15 text-teal-300 flex items-center justify-center text-xs font-bold">3</div>
                                                        <p><strong className="text-teal-300 font-semibold">Selecciona varios archivos</strong> en el cuadro de diálogo (se irán agregando como recientes).</p>
                                                    </div>
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-6 h-6 rounded-lg bg-teal-500/15 text-teal-300 flex items-center justify-center text-xs font-bold">4</div>
                                                        <p>Si es un <span className="text-teal-200">video grande</span>, espera a que se procese; se enviará tras subirse.</p>
                                                    </div>
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-6 h-6 rounded-lg bg-teal-500/15 text-teal-300 flex items-center justify-center text-xs font-bold">?</div>
                                                        <p>Formatos recomendados: JPG, PNG, MP4, WebM. Si algo no aparece, vuelve a pulsar "Ver más".</p>
                                                    </div>
                                                    <div className="pt-2 text-[11px] text-white/50 border-t border-white/10">Los elementos recientes viven sólo esta sesión.</div>
                                                </div>
                                            )}
                                        </div>
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
                                    keepOpenOnMobile={true}
                                />
                            )}
                        </div>
                        <div className="flex-1 relative">
                            {replyToMessage && (
                                <div className="absolute -top-20 left-0 right-0 animate-fade-in">
                                    <div className="relative rounded-xl overflow-hidden border theme-border flex items-stretch shadow-sm reply-preview-solid">
                                        <div className="w-1.5 bg-teal-500" />
                                        <div className="flex-1 min-w-0 flex items-center gap-3 px-3 py-2">
                                            {/* Mini preview según tipo */}
                                            {replyToMessage.messageType === 'image' && (
                                                <img src={replyToMessage.text} alt="miniatura" className="w-10 h-10 object-cover rounded-md border border-white/20" />
                                            )}
                                            {replyToMessage.messageType === 'video' && (
                                                <div className="w-10 h-10 rounded-md bg-black/30 dark:bg-white/10 flex items-center justify-center text-teal-400">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                                                </div>
                                            )}
                                            {replyToMessage.messageType === 'audio' && (
                                                <div className="w-10 h-10 rounded-md bg-black/30 dark:bg-white/10 flex items-center justify-center text-teal-400">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                                                </div>
                                            )}
                                            {['text', undefined, null].includes(replyToMessage.messageType) && (
                                                <div className="w-10 h-10 rounded-md bg-black/20 dark:bg-white/10 flex items-center justify-center text-teal-400">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="reply-label text-[11px] uppercase tracking-wide font-semibold opacity-70 mb-0.5">Respondiendo a</div>
                                                <div className="text-xs truncate" title={replyToMessage.text || ''}>
                                                    {/* Mostrar el contenido real del mensaje referenciado cuando sea texto; para multimedia mostrar etiqueta */}
                                                    {replyToMessage.messageType === 'image' ? 'Imagen' : replyToMessage.messageType === 'video' ? 'Video' : replyToMessage.messageType === 'audio' ? 'Audio' : (replyToMessage.text && String(replyToMessage.text).trim() ? String(replyToMessage.text).slice(0,240) : '(sin contenido)')}
                                                </div>
                                            </div>
                                            <div className="flex items-center px-1">
                                                <button
                                                    onClick={() => setReplyToMessage(null)}
                                                    className="p-1 rounded-md hover:bg-teal-500/10 dark:hover:bg-teal-400/10 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                                                    title="Cancelar respuesta"
                                                >
                                                    <svg className="w-4 h-4 text-teal-600 dark:text-teal-400 hover:text-teal-500 dark:hover:text-teal-300 transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
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
                                    onChange={handleMessageInputChange}
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
                                        // También considerar que input implica typing
                                        triggerTyping();
                                    }}
                                    onKeyPress={handleKeyPress}
                                    onBlur={() => {
                                        // Pequeño delay para permitir click en botón enviar sin cortar antes
                                        setTimeout(() => { stopTypingImmediate(); }, 200);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            // Enter para enviar -> el sendMessage ya llama stopTypingImmediate
                                            // pero por si hay race, limpiamos timeout antes
                                            if (typingTimeoutRef.current) {
                                                clearTimeout(typingTimeoutRef.current);
                                                typingTimeoutRef.current = null;
                                            }
                                        }
                                    }}
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
                                    placeholder="Buscar por nombre de usuario o email"
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
                                                {p.email && (
                                                    <span className="text-sm theme-text-secondary">{p.email}</span>
                                                )}
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
                                        <h4 className="font-semibold theme-text-primary flex items-center gap-2">
                                            <span className="truncate">{contact.name}</span>
                                            {isConversationMuted(contact.conversationId) && (
                                                <svg className="w-4 h-4 opacity-80 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <path d="M13.73 21a2 2 0 01-3.46 0" />
                                                    <path d="M18.63 13A17.89 17.89 0 0118 8" />
                                                    <path d="M6.88 6.88A6 6 0 0112 4v0a6 6 0 016 6v3l1 1H5l1-1V12a6 6 0 01.88-2.12" />
                                                    <line x1="1" y1="1" x2="23" y2="23" />
                                                </svg>
                                            )}
                                        </h4>
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
            {showDeleteMessageModal && deleteTargetMessage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteMessageModal(false)}>
                    <div className="w-full max-w-sm rounded-lg theme-bg-chat shadow-xl border theme-border p-5 animate-fade-in" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold mb-2 theme-text-primary">Eliminar mensaje</h3>
                        <p className="text-sm theme-text-secondary mb-4">Selecciona cómo deseas eliminar este mensaje.</p>
                        <div className="flex flex-col gap-3">
                            <button
                                className="px-4 py-2 rounded-md theme-bg-secondary theme-text-primary hover:opacity-80 text-sm flex items-center justify-between"
                                onClick={() => {
                                    handleHideMessageLocally(deleteTargetMessage.id);
                                    setShowDeleteMessageModal(false);
                                    toast.success('Mensaje ocultado para ti');
                                }}
                            >
                                <span>Eliminar para mí</span>
                                <span className="text-[10px] opacity-60">Solo tú</span>
                            </button>
                            {deleteTargetMessage.isOwn && (
                                <button
                                    className="px-4 py-2 rounded-md bg-gradient-to-r from-rose-500 to-rose-600 text-white text-sm hover:opacity-90 flex items-center justify-between"
                                    onClick={() => {
                                        handleDeleteForAll(deleteTargetMessage.id);
                                        setShowDeleteMessageModal(false);
                                    }}
                                >
                                    <span>Eliminar para todos</span>
                                    <span className="text-[10px] text-white/70">Irreversible</span>
                                </button>
                            )}
                            <button
                                className="px-4 py-2 rounded-md theme-bg-chat theme-text-secondary hover:opacity-80 text-sm"
                                onClick={() => setShowDeleteMessageModal(false)}
                            >Cancelar</button>
                        </div>
                        <p className="mt-4 text-[11px] leading-snug opacity-60">Esta acción no deja rastro. El mensaje se eliminará permanentemente para ambos si eliges "Eliminar para todos".</p>
                    </div>
                </div>
            )}
            <ProfileModal
                showProfileModal={showProfileModal}
                setShowProfileModal={(v) => { if (!v) setContactProfileData(null); setShowProfileModal(v); }}
                myProfile={myProfile}
                contactProfile={contactProfileData}
                isEditingName={isEditingName}
                setIsEditingName={setIsEditingName}
                newProfileName={newProfileName}
                setNewProfileName={setNewProfileName}
                isEditProfilePaused={isEditProfilePaused}
                setEditProfilePaused={setEditProfilePaused}
                isEditProfileStopped={isEditProfileStopped}
                setEditProfileStopped={setEditProfileStopped}
                lottieOptions={lottieOptions}
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
                notificationSettings={notificationSettings}
                onChangeNotificationSettings={setNotificationSettings}
                privacySettings={privacySettings}
                onChangePrivacySettings={setPrivacySettings}
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
            {/* Galería multimedia unificada (imágenes y videos) */}
            <MediaGalleryModal
                open={mediaGalleryOpen}
                index={mediaGalleryIndex}
                onClose={() => setMediaGalleryOpen(false)}
                onIndexChange={(i) => setMediaGalleryIndex(i)}
                items={chatMessages.filter(m => ['image','video'].includes(m.messageType)).map(m => ({
                    type: m.messageType,
                    src: m.text,
                    created_at: m.created_at,
                    id: m.id
                }))}
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