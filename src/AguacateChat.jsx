import animationTrash from './animations/wired-flat-185-trash-bin-hover-pinch.json';
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import Lottie from 'react-lottie';
import './AguacateChat.css';
import MessageRenderer from './MessageRenderer.jsx';
import AudioPlayer from './AudioPlayer.jsx';
import toast, { Toaster } from 'react-hot-toast';

import Sidebar from './Sidebar';
import ProfileModal from './ProfileModal';
import ConfigModal from './ConfigModal';
import PersonalizationModal from './PersonalizationModal';
import { useAuth } from './context/AuthContext.jsx';
import supabase from './services/supabaseClient';
import { createOrGetDirectConversation, fetchUserConversations, insertMessage, fetchMessagesPage, updateTable, uploadAudioToBucket } from './services/db';

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
import animationMic from './animations/wired-flat-188-microphone-recording-hover-recording.json';

const initialContacts = [
    { name: 'Ana García', status: '🟢', lastMessage: '¡Hola! ¿Cómo estás?', time: '14:30', initials: 'AG' },
    { name: 'Carlos López', status: '🟡', lastMessage: 'Perfecto, nos vemos mañana', time: '13:45', initials: 'CL' },
    { name: 'María Rodríguez', status: '🔴', lastMessage: 'Gracias por la información', time: '12:20', initials: 'MR' },
    { name: 'Equipo Desarrollo', status: '🟢', lastMessage: 'La nueva versión está lista', time: '11:55', initials: 'ED', unread: 3 },
];

const initialMessages = {
    'Ana García': [
        { type: 'received', text: '¡Hola! ¿Cómo estás? Espero que tengas un excelente día' },
        { type: 'sent', text: '¡Hola Ana! Todo muy bien, gracias. ¿Y tú qué tal?' },
        { type: 'received', text: 'Muy bien también. ¿Tienes tiempo para una videollamada?' },
        { type: 'sent', text: '¡Por supuesto! Dame 5 minutos y te llamo' }
    ],
    'Carlos López': [
        { type: 'received', text: 'Oye, ¿viste el proyecto nuevo?' },
        { type: 'sent', text: 'Sí, se ve muy interesante' },
        { type: 'received', text: 'Perfecto, nos vemos mañana para revisarlo' }
    ],
    'María Rodríguez': [
        { type: 'sent', text: 'Te envié la información que pediste' },
        { type: 'received', text: 'Gracias por la información, muy útil' },
        { type: 'sent', text: '¡De nada! Cualquier cosa me avisas' }
    ],
    'Equipo Desarrollo': [
        { type: 'received', text: 'La nueva versión está lista para testing' },
        { type: 'sent', text: 'Excelente, empiezo las pruebas ahora' },
        { type: 'received', text: 'Perfecto, cualquier bug me avisas' }
    ]
};

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
    const { user } = useAuth();
    const [isDarkMode, setIsDarkMode] = useState(getCookie('darkMode') === 'true');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    // No seleccionar conversación por defecto al cargar
    const [selectedContact, setSelectedContact] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    // Paginación de mensajes
    const PAGE_SIZE = 15;
    const [hasMoreOlder, setHasMoreOlder] = useState(false);
    const [oldestCursor, setOldestCursor] = useState(null); // ISO date of oldest loaded message
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [messageInput, setMessageInput] = useState('');
    const [showNewChatMenu, setShowNewChatMenu] = useState(false);
    const [showChatOptionsMenu, setShowChatOptionsMenu] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showContactModal, setShowContactModal] = useState(false);
    const [modalType, setModalType] = useState('chat');
    const [selectedGroupContacts, setSelectedGroupContacts] = useState([]);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [showSideMenu, setShowSideMenu] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [showPersonalizationModal, setShowPersonalizationModal] = useState(false);
    const [personalization, setPersonalization] = useState({
        backgroundType: 'solid',
        backgroundColor: '#f8fafc',
        backgroundImage: '',
        bubbleColors: { sent: '#e2e8f0', received: '#10b981' },
        accentColor: '#14B8A6',
        fontSize: 16
    });
    const [isTyping, setIsTyping] = useState(false); // Nuevo estado

    // Grabación de audio (MediaRecorder)
    const [isRecording, setIsRecording] = useState(false);
    const [isRecordingPaused, setIsRecordingPaused] = useState(false);
    const [recordingElapsed, setRecordingElapsed] = useState(0); // seconds
    const MAX_RECORD_SECS = 120; // 2 minutes limit
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const audioStreamRef = useRef(null);
    const recordingStartRef = useRef(0);
    const accumulatedElapsedRef = useRef(0); // seconds
    const recordingIntervalRef = useRef(null);
    const discardOnStopRef = useRef(false);
    const limitReachedRef = useRef(false);
    // MIME elegido para la grabación (preferir OGG/Opus si es posible)
    const recorderMimeRef = useRef('');

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
    const [loadingConversations, setLoadingConversations] = useState(true);

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
            const lastContent = c?.last_message?.content || '';
            const lastAt = c?.last_message_at || c?.created_at;
            console.log('Contact', name, 'isOnline:', c?.otherProfile?.isOnline, 'status:', c?.otherProfile?.isOnline ? '🟢' : formatLastConex(c?.otherProfile?.lastConex));
            return {
                name,
                status: c?.otherProfile?.isOnline ? '🟢' : formatLastConex(c?.otherProfile?.lastConex),
                lastMessage: lastContent,
                time: formatTime(lastAt),
                initials: deriveInitials(name),
                profileId: c?.otherProfile?.id,
                username: c?.otherProfile?.username,
                avatar_url: c?.otherProfile?.avatar_url,
                conversationId: c?.conversationId,
                last_message_at: lastAt,
                lastConex: c?.otherProfile?.lastConex,
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
                                const label = usedType.includes('ogg') ? 'OGG' : usedType.includes('webm') ? 'WebM' : usedType || 'audio';
                                toast.success(`Audio subido y enviado (${label})`);
                            } catch (e) {
                                console.error('Error al subir/enviar audio:', e);
                                toast.error('No se pudo subir/enviar el audio');
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

    // Mantener referencia de la conversación seleccionada para Realtime global
    const selectedConvIdRef = useRef(null);

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
                                    return {
                                        ...c,
                                        last_message: { id: m.id, content: m.content, sender_id: m.sender_id, type: m.type },
                                        last_message_at: m.created_at,
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
                                ? { id: m.id, type: 'received', audioUrl: m.content, text: '(Audio)', created_at: m.created_at }
                                : { id: m.id, type: 'received', text: m.content, created_at: m.created_at },
                        ]);
                    } else if (evt === 'UPDATE') {
                        const m = payload.new;
                        if (!m) return;
                        if (m.conversation_id !== selectedConvIdRef.current) return;
                        setChatMessages((prev) => prev.map(msg => (
                            msg.id === m.id
                                ? (m.type === 'audio'
                                    ? { ...msg, audioUrl: m.content, text: '(Audio)', created_at: m.created_at }
                                    : { ...msg, text: m.content, created_at: m.created_at })
                                : msg
                        )));
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
                    console.log('Profile realtime event:', payload);
                    const updatedProfile = payload.new;
                    if (!updatedProfile) return;
                    console.log('Updating profile:', updatedProfile.id, 'isOnline:', updatedProfile.isOnline);
                    // Actualizar el perfil en las conversaciones
                    setConversations((prev) => prev.map((c) => {
                        if (c.otherProfile?.id === updatedProfile.id) {
                            console.log('Found matching conversation for user:', updatedProfile.id);
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
                console.log('Profiles realtime subscription status:', status);
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
        setSelectedContact(contact);
        // Reset paginación
        setChatMessages([]);
        setHasMoreOlder(false);
        setOldestCursor(null);
        setLoadingOlder(false);
        shouldScrollToBottomRef.current = true; // al abrir chat, ir al final
        // Cargar última página si hay conversationId
        try {
            if (contact?.conversationId) {
                const { messages, hasMore, nextCursor } = await fetchMessagesPage(contact.conversationId, { limit: PAGE_SIZE });
                const mapped = messages.map(m => ({
                    id: m.id,
                    type: m.sender_id === user?.id ? 'sent' : 'received',
                    ...(m.type === 'audio' ? { audioUrl: m.content, text: '(Audio)' } : { text: m.content }),
                    created_at: m.created_at,
                }));
                setChatMessages(mapped);
                setHasMoreOlder(hasMore);
                setOldestCursor(nextCursor);
            }
        } catch (e) {
            console.error('No se pudieron cargar mensajes:', e);
            setChatMessages([]);
            setHasMoreOlder(false);
            setOldestCursor(null);
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
            const { messages, hasMore, nextCursor } = await fetchMessagesPage(selectedContact.conversationId, { limit: PAGE_SIZE, before: oldestCursor });
            const mapped = messages.map(m => ({
                id: m.id,
                type: m.sender_id === user?.id ? 'sent' : 'received',
                ...(m.type === 'audio' ? { audioUrl: m.content, text: '(Audio)' } : { text: m.content }),
                created_at: m.created_at,
            }));
            setChatMessages(prev => [...mapped, ...prev]);
            setHasMoreOlder(hasMore);
            setOldestCursor(nextCursor);
        } catch (e) {
            console.error('Error cargando mensajes anteriores:', e);
        } finally {
            setLoadingOlder(false);
        }
    };

    const sendMessage = async () => {
        const content = messageInput.trim();
        if (!content) return;
        if (!selectedContact?.conversationId) {
            toast.error('No hay conversación activa');
            return;
        }
    const tempId = `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const optimistic = { id: tempId, type: 'sent', text: content, created_at: new Date().toISOString() };
        setChatMessages(prev => [...prev, optimistic]);
        setMessageInput('');
        try {
            await insertMessage({ conversationId: selectedContact.conversationId, senderId: user?.id, content });
        } catch (e) {
            console.error('Error enviando mensaje:', e);
            toast.error('No se pudo enviar el mensaje');
            // opcional: revertir optimismo o marcar como fallido
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const contacts = conversationsToContacts(conversations);
    const filteredContacts = contacts.filter(contact =>
        (contact.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contact.lastMessage || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleNewChatMenu = () => {
        setShowNewChatMenu(!showNewChatMenu);
    };

    const toggleChatOptions = () => {
        setShowChatOptionsMenu(!showChatOptionsMenu);
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
            />
            {/* Sidebar de contactos */}
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
                    <div className="relative" onMouseEnter={() => {
                        setSearchStopped(true);
                        setTimeout(() => {
                            setSearchStopped(false);
                            setSearchPaused(false);
                        }, 10);
                    }} onMouseLeave={() => setSearchPaused(true)}>
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
                    {contacts.length === 0 && !loadingConversations && (
                        <div className="h-full flex flex-col items-center justify-center text-center px-6 gap-4">
                            <p className="theme-text-secondary">No tienes conversaciones todavía.</p>
                            <button onClick={createNewChat} className="px-4 py-2 rounded-lg bg-gradient-to-r from-teal-primary to-teal-secondary text-white hover:opacity-90 transition-opacity">Crear nueva conversación</button>
                        </div>
                    )}
                    {filteredContacts.map((contact, index) => (
                        <div
                            key={index}
                            className={`contact-item p-4 hover:theme-bg-chat cursor-pointer transition-colors border-b theme-border ${selectedContact?.name === contact.name ? 'theme-bg-chat' : ''}`}
                            onClick={() => selectContact(contact)}
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
                                        <p className={`text-sm truncate ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{contact.lastMessage}</p>
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
                                className="w-14 h-14 rounded-full bg-gradient-to-r from-teal-primary to-teal-secondary text-white text-2xl font-bold hover:opacity-90 transition-all duration-300 shadow-2xl transform hover:scale-105"
                            >
                                +
                            </button>
                            <div id="newChatMenu" className={`absolute right-0 bottom-16 w-48 theme-bg-chat rounded-lg shadow-2xl border theme-border z-30 ${showNewChatMenu ? '' : 'hidden'}`}>
                                <button onClick={createNewChat} className="w-full text-left p-3 hover:theme-bg-secondary theme-text-primary rounded-t-lg transition-colors">
                                    💬 Nuevo Chat
                                </button>
                                <button onClick={createNewGroup} className="w-full text-left p-3 hover:theme-bg-secondary theme-text-primary rounded-b-lg transition-colors">
                                    👥 Nuevo Grupo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Área principal del chat */}
            <div className="flex-1 flex flex-col">
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
                                <button onClick={toggleChatOptions} className="p-2 rounded-lg theme-bg-chat hover:opacity-80 transition-opacity flex flex-col gap-1 items-center justify-center w-10 h-10" title="Opciones del chat" disabled={!selectedContact}>
                                    <span className="w-1 h-1 bg-current rounded-full"></span>
                                    <span className="w-1 h-1 bg-current rounded-full"></span>
                                    <span className="w-1 h-1 bg-current rounded-full"></span>
                                </button>
                                <div id="chatOptionsMenu" className={`absolute right-0 top-12 w-56 theme-bg-chat rounded-lg shadow-2xl border theme-border z-30 ${showChatOptionsMenu && selectedContact ? '' : 'hidden'}`}>
                                    <button 
                                        onClick={() => { alert('Limpiar chat'); toggleChatOptions(); }} 
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
                                        onClick={() => { alert('Fijar conversación'); toggleChatOptions(); }} 
                                        className="w-full text-left p-3 hover:theme-bg-secondary theme-text-primary transition-colors flex items-center gap-2"
                                        onMouseEnter={() => {
                                            setPinStopped(true);
                                            setTimeout(() => {
                                                setPinStopped(false);
                                                setPinPaused(false);
                                            }, 10);
                                        }}
                                        onMouseLeave={() => setPinPaused(true)}
                                    >
                                        <div className="w-5 h-5">
                                            <Lottie 
                                                options={lottieOptions.pin} 
                                                isPaused={isPinPaused} 
                                                isStopped={isPinStopped} 
                                                height={24} width={24} 
                                            />
                                        </div>
                                        <span>Fijar conversación</span>
                                    </button>
                                    <button 
                                        onClick={() => { alert('Bloquear contacto'); toggleChatOptions(); }} 
                                        className="w-full text-left p-3 hover:theme-bg-secondary theme-text-primary transition-colors flex items-center gap-2"
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
                                        <span>Bloquear contacto</span>
                                    </button>
                                    <button 
                                        onClick={() => { alert('Ver información'); toggleChatOptions(); }} 
                                        className="w-full text-left p-3 hover:theme-bg-secondary theme-text-primary rounded-b-lg transition-colors flex items-center gap-2"
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
                    className="flex-1 overflow-y-auto p-4 space-y-4 chat-container"
                    onScroll={(e) => {
                        const el = e.currentTarget;
                        // stick-to-bottom tracking
                        const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 60;
                        stickToBottomRef.current = nearBottom;
                        // top detection for infinite load
                        if (el.scrollTop <= 80 && hasMoreOlder && !loadingOlder) {
                            loadOlderMessages();
                        }
                    }}
                >
                    {!selectedContact ? (
                        <div className="h-full w-full flex items-center justify-center">
                            <div className="text-center max-w-md px-6 py-10 rounded-2xl theme-bg-chat border theme-border">
                                <h3 className="text-xl font-semibold theme-text-primary mb-2">¡Bienvenido a AguacaChat! 🥑</h3>
                                <p className="theme-text-secondary">Selecciona una conversación de la lista o crea un nuevo chat para comenzar a chatear.</p>
                                <div className="mt-6 flex gap-3 justify-center">
                                    <button onClick={createNewChat} className="px-4 py-2 rounded-lg bg-gradient-to-r from-teal-primary to-teal-secondary text-white hover:opacity-90 transition-opacity">Nuevo chat</button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Loader de mensajes anteriores */}
                            {hasMoreOlder && (
                                <div className="w-full flex justify-center">
                                    <div className="text-xs px-3 py-1 rounded-full theme-bg-chat theme-text-secondary border theme-border">
                                        {loadingOlder ? 'Cargando mensajes...' : 'Desliza hacia arriba para ver más'}
                                    </div>
                                </div>
                            )}
                            {chatMessages.map((message, index) => (
                                <div key={index} className={`flex ${message.type === 'sent' ? 'justify-end' : 'justify-start'}`}>
                                    {message.type === 'received' && (
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
                                    <div className={`${message.type === 'sent' ? 'message-sent rounded-br-md' : 'message-received rounded-bl-md'} max-w-xs lg:max-w-md px-4 py-2 rounded-2xl break-words flex flex-col`}>
                                        <div>
                                            {message.audioUrl ? (
                                                <AudioPlayer src={message.audioUrl} className="w-full max-w-xs" />
                                            ) : (
                                                <MessageRenderer text={message.text} chunkSize={450} />
                                            )}
                                        </div>
                                        <div className="text-[10px] self-end" style={{ color: 'var(--text-secondary)'}}>
                                            {message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </div>
                                    </div>
                                </div>
                            ))}
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
                        </>
                    )}
                </div>

                {selectedContact && (
                <div className="theme-bg-secondary theme-border border-t p-4">
                    <div className="flex items-center gap-3">
                        {/* 4. REEMPLAZO DEL ICONO DE ADJUNTAR */}
                        <button 
                            onClick={() => setShowAttachMenu(!showAttachMenu)} 
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
                        {showAttachMenu && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                                <div className="theme-bg-secondary rounded-2xl w-full max-w-xs flex flex-col">
                                    <div className="p-4 theme-border border-b flex items-center justify-between">
                                        <h3 className="text-lg font-bold theme-text-primary">Adjuntar archivo</h3>
                                        <button onClick={() => setShowAttachMenu(false)} className="p-2 rounded-lg theme-bg-chat hover:opacity-80 transition-opacity">
                                            ✕
                                        </button>
                                    </div>
                                    <div className="flex flex-col gap-2 p-4">
                                        <button
                                            className="flex items-center gap-2 p-2 rounded transition-colors"
                                            onClick={() => { alert('Enviar foto'); setShowAttachMenu(false); }}
                                            onMouseEnter={() => {
                                                setPhotoStopped(true);
                                                setTimeout(() => {
                                                    setPhotoStopped(false);
                                                    setPhotoPaused(false);
                                                }, 10);
                                            }}
                                            onMouseLeave={() => {
                                                setPhotoPaused(true);
                                                setPhotoStopped(true);
                                                setTimeout(() => setPhotoStopped(false), 10);
                                            }}
                                        >
                                            <div className="w-8 h-8">
                                                <Lottie options={lottieOptions.photo} isPaused={isPhotoPaused} isStopped={isPhotoStopped} />
                                            </div>
                                            <span className="theme-text-primary">Enviar foto</span>
                                        </button>
                                        <button
                                            className="flex items-center gap-2 p-2 rounded transition-colors"
                                            onClick={() => { alert('Enviar video'); setShowAttachMenu(false); }}
                                            onMouseEnter={() => {
                                                setVideoStopped(true);
                                                setTimeout(() => {
                                                    setVideoStopped(false);
                                                    setVideoPaused(false);
                                                }, 10);
                                            }}
                                            onMouseLeave={() => {
                                                setVideoPaused(true);
                                                setVideoStopped(true);
                                                setTimeout(() => setVideoStopped(false), 10);
                                            }}
                                        >
                                            <div className="w-8 h-8">
                                                <Lottie options={lottieOptions.video} isPaused={isVideoPaused} isStopped={isVideoStopped} />
                                            </div>
                                            <span className="theme-text-primary">Enviar video</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* 4. REEMPLAZO DEL ICONO DE EMOJI */}
                        <button 
                            onClick={() => alert('Mostrar emojis')} 
                            className="p-1 rounded-lg theme-bg-chat hover:opacity-80 transition-opacity" 
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
                        <div className="flex-1 relative flex items-end">
                            {isRecording && (
                                <div className="absolute -top-12 left-0 right-0 flex items-center justify-between gap-3 px-3 py-2 rounded-xl theme-bg-chat theme-border border">
                                    <div className="flex items-center gap-2">
                                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                                            Grabando {formatSeconds(Math.min(recordingElapsed, MAX_RECORD_SECS))}
                                        </span>
                                        <div className="w-6 h-6 opacity-80">
                                            <Lottie options={lottieOptions.micRecording} isPaused={isRecordingPaused} isStopped={false} />
                                        </div>
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
                            <textarea
                                id="messageInput"
                                placeholder={selectedContact ? "Escribe un mensaje..." : "Selecciona una conversación para empezar"}
                                className="w-full px-7 py-4 pr-20 rounded-full theme-bg-chat theme-text-primary focus:outline-none focus:ring-2 focus:ring-teal-primary resize-none"
                                style={{
                                    minHeight: '44px',
                                    maxHeight: '160px',
                                    lineHeight: '1.5',
                                    marginBottom: '2px',
                                    background: 'var(--bg-chat, #222)',
                                    overflow: 'hidden'
                                }}
                                value={messageInput}
                                onChange={e => setMessageInput(e.target.value)}
                                onInput={e => {
                                    e.target.style.height = '44px';
                                    e.target.style.height = e.target.scrollHeight + 'px';
                                }}
                                onKeyPress={handleKeyPress}
                                rows={1}
                                disabled={!selectedContact}
                            />
                            {(isRecording || messageInput.trim().length === 0) ? (
                                <button
                                    onClick={toggleRecording}
                                    className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2 ${isRecording ? 'bg-red-500' : 'bg-gradient-to-r from-teal-primary to-teal-secondary'} text-white rounded-full hover:opacity-80 transition-opacity`}
                                    disabled={!selectedContact}
                                    onMouseEnter={() => {
                                        setMicStopped(true);
                                        setTimeout(() => {
                                            setMicStopped(false);
                                            setMicPaused(false);
                                        }, 10);
                                    }}
                                    onMouseLeave={() => setMicPaused(true)}
                                    title={isRecording ? (isRecordingPaused ? 'Reanudar grabación' : 'Pausar/Detener grabación') : 'Grabar audio'}
                                >
                                    <div className="w-7 h-7">
                                        <Lottie options={isRecording ? lottieOptions.micRecording : lottieOptions.mic} isPaused={isRecording ? isRecordingPaused : isMicPaused} isStopped={isRecording ? false : isMicStopped}/>
                                    </div>
                                </button>
                            ) : (
                                <button
                                    onClick={sendMessage}
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-gradient-to-r from-teal-primary to-teal-secondary text-white rounded-full hover:opacity-80 transition-opacity"
                                    disabled={!selectedContact}
                                    onMouseEnter={() => {
                                        setSendStopped(true);
                                        setTimeout(() => {
                                            setSendStopped(false);
                                            setSendPaused(false);
                                        }, 10);
                                    }}
                                    onMouseLeave={() => setSendPaused(true)}
                                    title="Enviar mensaje"
                                >
                                    <div className="w-7 h-7">
                                        <Lottie options={lottieOptions.send} isPaused={isSendPaused} isStopped={isSendStopped}/>
                                    </div>
                                </button>
                            )}
                        </div>
                    </div>
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
        </div>
    );
};

export default AguacateChat;