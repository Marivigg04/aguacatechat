import React, { useState, useEffect } from 'react';
import Lottie from 'react-lottie';
import './AguacateChat.css';

import Sidebar from './Sidebar';
import ProfileModal from './ProfileModal';
import ConfigModal from './ConfigModal';

// 1. Importar los archivos de animación desde la carpeta src/animations
import animationTrash from './animations/wired-flat-185-trash-bin-hover-pinch.json';
import animationSearch from './animations/wired-flat-19-magnifier-zoom-search-hover-rotation.json';
import animationSmile from './animations/wired-flat-261-emoji-smile-hover-smile.json';
import animationLink from './animations/wired-flat-11-link-unlink-hover-bounce.json';
import animationShare from './animations/wired-flat-751-share-hover-pointing.json'; 
import animationSend from './animations/wired-flat-177-envelope-send-hover-flying.json';
import animationPhoto from './animations/wired-lineal-61-camera-hover-flash.json';
import animationVideo from './animations/wired-flat-1037-vlog-camera-hover-pinch.json';
import animationConfig from './animations/system-solid-22-build-hover-build.json';
import animationProfile from './animations/system-regular-8-account-hover-pinch.json';
import animationEditProfile from './animations/wired-flat-35-edit-hover-circle.json';
import animationInfoProfile from './animations/wired-flat-112-book-hover-closed.json';
import animationPhotoProfile from './animations/wired-flat-3099-portrait-photo-hover-pinch.json';
import animationTypingProfile from './animations/Typing.json';
import animationLockProfile from './animations/lock.json';

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

const AguacateChat = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [selectedContact, setSelectedContact] = useState(initialContacts[0]);
    const [chatMessages, setChatMessages] = useState(initialMessages[initialContacts[0].name]);
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
    
    // 2. Estados para controlar las animaciones al pasar el cursor
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

    const [isPhotoPaused, setPhotoPaused] = useState(true);
    const [isPhotoStopped, setPhotoStopped] = useState(false);

    const [isVideoPaused, setVideoPaused] = useState(true);
    const [isVideoStopped, setVideoStopped] = useState(false);

    const [isProfilePaused, setProfilePaused] = useState(true);
    const [isProfileStopped, setProfileStopped] = useState(false);

    const [isConfigPaused, setConfigPaused] = useState(true);
    const [isConfigStopped, setConfigStopped] = useState(false);



    const allContacts = [
        ...initialContacts,
        { name: 'Pedro Martínez', status: '🟢', lastMessage: 'Hola, ¿cómo estás?', time: 'Ayer', initials: 'PM' },
        { name: 'Laura Sánchez', status: '🟡', lastMessage: '¿Tienes un minuto?', time: 'Lunes', initials: 'LS' },
        { name: 'David González', status: '🔴', lastMessage: 'Ok, hablamos más tarde', time: 'Ayer', initials: 'DG' },
        { name: 'Sofia Ruiz', status: '🟢', lastMessage: 'Nos vemos pronto', time: 'Hace 2h', initials: 'SR' }
    ];

    // 3. Opciones por defecto para cada animación
    const createLottieOptions = (animationData) => ({
        loop: false,
        autoplay: false,
        animationData: animationData,
        rendererSettings: {
            preserveAspectRatio: 'xMidYMid slice'
        }
    });

    const lottieOptions = {
        search: createLottieOptions(animationSearch),
        link: createLottieOptions(animationLink),
        smile: createLottieOptions(animationSmile),
        trash: createLottieOptions(animationTrash),
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
    };

    useEffect(() => {
        document.body.className = isDarkMode ? 'dark-mode theme-bg-primary theme-text-primary transition-colors duration-300' : 'light-mode theme-bg-primary theme-text-primary transition-colors duration-300';
    }, [isDarkMode]);

    useEffect(() => {
        const chatArea = document.getElementById('chatArea');
        if (chatArea) {
            chatArea.scrollTop = chatArea.scrollHeight;
        }
    }, [chatMessages]);

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const selectContact = (contact) => {
        setSelectedContact(contact);
        setChatMessages(initialMessages[contact.name] || []);
        if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
        }
    };

    const sendMessage = () => {
        if (messageInput.trim() === '') return;

        const newMessage = { type: 'sent', text: messageInput };
        setChatMessages([...chatMessages, newMessage]);
        setMessageInput('');

        // Simular respuesta
        setTimeout(() => {
            const responses = ['¡Perfecto!', 'Entendido 👍', 'Gracias por el mensaje', 'Me parece bien', '¡Excelente!'];
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            const receivedMessage = { type: 'received', text: randomResponse };
            setChatMessages(prevMessages => [...prevMessages, receivedMessage]);
        }, 2000);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    };

    const filteredContacts = allContacts.filter(contact =>
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
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
            alert(`Creando grupo con: ${selectedGroupContacts.map(c => c.name).join(', ')}`);
            closeContactModal();
        }
    };

    // Agrega tu información de perfil aquí:
    const myProfile = {
        name: 'María Fernández',
        initials: 'MF',
        phone: '+34 612 345 678'
    };

    // Estados para ProfileModal
    const [isEditingName, setIsEditingName] = useState(false);
    const [newProfileName, setNewProfileName] = useState(myProfile.name);
    const [isEditProfilePaused, setEditProfilePaused] = useState(true);
    const [isEditProfileStopped, setEditProfileStopped] = useState(false);

    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [profileInfo, setProfileInfo] = useState(
        'Este es tu espacio personal. Puedes escribir aquí una breve descripción sobre ti, tus intereses o cualquier información relevante que quieras mostrar a tus contactos.'
    );
    const [newProfileInfo, setNewProfileInfo] = useState('');
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

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <Sidebar
                showSideMenu={showSideMenu}
                setShowSideMenu={setShowSideMenu}
                setShowProfileModal={setShowProfileModal}
                setShowConfigModal={setShowConfigModal}
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
                        <h1 className="text-xl font-bold theme-text-primary">AguacateChat</h1>
                        <div className="flex items-center gap-2">
                            <button id="themeToggle" className="p-2 rounded-lg theme-bg-chat hover:opacity-80 transition-opacity" onClick={toggleTheme}>
                                <span id="themeIcon">{isDarkMode ? '☀️' : '🌙'}</span>
                            </button>
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
                    {filteredContacts.map((contact, index) => (
                        <div
                            key={index}
                            className={`contact-item p-4 hover:theme-bg-chat cursor-pointer transition-colors border-b theme-border ${selectedContact.name === contact.name ? 'theme-bg-chat' : ''}`}
                            onClick={() => selectContact(contact)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-teal-primary to-teal-secondary rounded-full flex items-center justify-center text-white font-bold">
                                    {contact.initials}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-semibold theme-text-primary">{contact.name}</h3>
                                        <span className="text-xs theme-text-secondary">{contact.time}</span>
                                    </div>
                                    <p className="text-sm theme-text-secondary truncate">{contact.lastMessage}</p>
                                </div>
                                {contact.unread > 0 && (
                                    <div className="bg-teal-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{contact.unread}</div>
                                )}
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
                <div className="theme-bg-secondary theme-border border-b p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button className="md:hidden p-2 rounded-lg theme-bg-chat" onClick={toggleSidebar}>
                            ☰
                        </button>
                        <div className="w-10 h-10 bg-gradient-to-br from-teal-primary to-teal-secondary rounded-full flex items-center justify-center text-white font-bold">
                            {selectedContact.initials}
                        </div>
                        <div>
                            <h2 id="chatName" className="font-semibold theme-text-primary">{selectedContact.name}</h2>
                            <p id="chatStatus" className="text-sm theme-text-secondary">{selectedContact.status === '🟢' ? 'En línea' : selectedContact.status === '🟡' ? 'Ausente' : 'Desconectado'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <button onClick={toggleChatOptions} className="p-2 rounded-lg theme-bg-chat hover:opacity-80 transition-opacity" title="Opciones del chat">
                                {/* Icono de tres puntos */}
                                <span style={{ fontSize: '1.5rem', lineHeight: '1' }}>⋯</span>
                            </button>
                            <div id="chatOptionsMenu" className={`absolute right-0 top-12 w-56 theme-bg-chat rounded-lg shadow-2xl border theme-border z-30 ${showChatOptionsMenu ? '' : 'hidden'}`}>
                                <button onClick={() => { alert('Silenciar notificaciones'); toggleChatOptions(); }} className="w-full text-left p-3 hover:theme-bg-secondary theme-text-primary rounded-t-lg transition-colors flex items-center gap-2">
                                    🔇 <span>Silenciar notificaciones</span>
                                </button>
                                <button onClick={() => { alert('Fijar conversación'); toggleChatOptions(); }} className="w-full text-left p-3 hover:theme-bg-secondary theme-text-primary transition-colores flex items-center gap-2">
                                    📌 <span>Fijar conversación</span>
                                </button>
                                <button onClick={() => { alert('Exportar chat'); toggleChatOptions(); }} className="w-full text-left p-3 hover:theme-bg-secondary theme-text-primary transition-colores flex items-center gap-2"
                                    onMouseEnter={() => {
                                        setShareStopped(true);
                                        setTimeout(() => {
                                            setShareStopped(false);
                                            setSharePaused(false);
                                        }, 10);
                                    }}
                                    onMouseLeave={() => setSharePaused(true)}
                                >
                                    <div className="w-5 h-5">
                                        <Lottie options={lottieOptions.share} isPaused={isSharePaused} isStopped={isShareStopped}/>
                                    </div>
                                    <span>Exportar chat</span>
                                </button>
                                {/* 4. REEMPLAZO DEL ICONO DE LIMPIAR CHAT */}
                                <button 
                                    onClick={() => { alert('Limpiar chat'); toggleChatOptions(); }} 
                                    className="w-full text-left p-3 hover:theme-bg-secondary theme-text-primary transition-colores flex items-center gap-2"
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
                                <button onClick={() => { alert('Bloquear contacto'); toggleChatOptions(); }} className="w-full text-left p-3 hover:theme-bg-secondary theme-text-primary transition-colores flex items-center gap-2">
                                    🚫 <span>Bloquear contacto</span>
                                </button>
                                <button onClick={() => { alert('Ver información'); toggleChatOptions(); }} className="w-full text-left p-3 hover:theme-bg-secondary theme-text-primary rounded-b-lg transition-colores flex items-center gap-2">
                                    ℹ️ <span>Ver información</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="chatArea" className="flex-1 overflow-y-auto p-4 space-y-4 chat-container scroll-smooth">
                    {chatMessages.map((message, index) => (
                        <div key={index} className={`flex ${message.type === 'sent' ? 'justify-end' : 'justify-start'}`}>
                            {message.type === 'received' && (
                                <div className="w-8 h-8 bg-gradient-to-br from-teal-primary to-teal-secondary rounded-full flex items-center justify-center text-white text-xs font-bold mr-2">
                                    {selectedContact.initials}
                                </div>
                            )}
                            <div className={`${message.type === 'sent' ? 'message-sent rounded-br-md' : 'message-received rounded-bl-md'} max-w-xs lg:max-w-md px-4 py-2 rounded-2xl`}>
                                {message.text}
                            </div>
                        </div>
                    ))}
                </div>

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
                        <div className="flex-1 relative">
                            <input
                                id="messageInput"
                                type="text"
                                placeholder="Escribe un mensaje..."
                                className="w-full p-3 pr-12 rounded-2xl theme-bg-chat theme-text-primary focus:outline-none focus:ring-2 focus:ring-teal-primary"
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                            />
                            <button
                                onClick={sendMessage}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-gradient-to-r from-teal-primary to-teal-secondary text-white rounded-full hover:opacity-80 transition-opacity"
                                onMouseEnter={() => {
                                    setSendStopped(true);
                                    setTimeout(() => {
                                        setSendStopped(false);
                                        setSendPaused(false);
                                    }, 10);
                                }}
                                onMouseLeave={() => setSendPaused(true)}
                            >
                                <div className="w-7 h-7">
                                    <Lottie options={lottieOptions.send} isPaused={isSendPaused} isStopped={isSendStopped}/>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
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
                            {modalType === 'chat' ? 'Selecciona un contacto para iniciar una conversación' : 'Selecciona los contactos para agregar al grupo'}
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
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
                    </div>

                    {modalType === 'group' && (
                        <div className="p-4 theme-border border-t">
                            <div id="groupActions" className="mb-3">
                                <div className="flex items-center justify-between mb-2">
                                    <span id="selectedCount" className="text-sm theme-text-secondary">{selectedGroupContacts.length} contactos seleccionados</span>
                                    <button onClick={() => setSelectedGroupContacts([])} className="text-xs theme-text-secondary hover:opacity-80">Limpiar</button>
                                </div>
                                <button onClick={createGroupWithSelected} className="w-full p-3 bg-gradient-to-r from-teal-primary to-teal-secondary text-white rounded-lg hover:opacity-90 transition-opacity mb-2">
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
                isEditingInfo={isEditingInfo}
                setIsEditingInfo={setIsEditingInfo}
                profileInfo={profileInfo}
                setProfileInfo={setProfileInfo}
                newProfileInfo={newProfileInfo}
                setNewProfileInfo={setNewProfileInfo}
                isInfoProfilePaused={isInfoProfilePaused}
                setInfoProfilePaused={setInfoProfilePaused}
                isInfoProfileStopped={isInfoProfileStopped}
                setInfoProfileStopped={setInfoProfileStopped}
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
            />
        </div>
    );
};

export default AguacateChat;