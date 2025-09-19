import React, { useState, useEffect } from 'react';
import './AguacateChat.css';

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

    const allContacts = [
        ...initialContacts,
        { name: 'Pedro Martínez', status: '🟢', lastMessage: 'Hola, ¿cómo estás?', time: 'Ayer', initials: 'PM' },
        { name: 'Laura Sánchez', status: '🟡', lastMessage: '¿Tienes un minuto?', time: 'Lunes', initials: 'LS' },
        { name: 'David González', status: '🔴', lastMessage: 'Ok, hablamos más tarde', time: 'Ayer', initials: 'DG' },
        { name: 'Sofia Ruiz', status: '🟢', lastMessage: 'Nos vemos pronto', time: 'Hace 2h', initials: 'SR' }
    ];

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

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Overlay para móvil */}
            <div id="overlay" className={`fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden ${isSidebarOpen ? '' : 'hidden'}`} onClick={toggleSidebar}></div>

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
                    <div className="relative">
                        <input
                            id="searchInput"
                            type="text"
                            placeholder="Buscar conversaciones..."
                            className="w-full p-3 pl-10 rounded-lg theme-bg-chat theme-text-primary theme-border border focus:outline-none focus:ring-2 focus:ring-teal-primary"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <span className="absolute left-3 top-3 theme-text-secondary">🔍</span>
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
                            <button onClick={toggleChatOptions} className="p-2 rounded-lg theme-bg-chat hover:opacity-80 transition-opacity" title="Opciones del chat">⚙️</button>
                            <div id="chatOptionsMenu" className={`absolute right-0 top-12 w-56 theme-bg-chat rounded-lg shadow-2xl border theme-border z-30 ${showChatOptionsMenu ? '' : 'hidden'}`}>
                                <button onClick={() => { alert('Silenciar notificaciones'); toggleChatOptions(); }} className="w-full text-left p-3 hover:theme-bg-secondary theme-text-primary rounded-t-lg transition-colors flex items-center gap-2">
                                    🔇 <span>Silenciar notificaciones</span>
                                </button>
                                <button onClick={() => { alert('Fijar conversación'); toggleChatOptions(); }} className="w-full text-left p-3 hover:theme-bg-secondary theme-text-primary transition-colors flex items-center gap-2">
                                    📌 <span>Fijar conversación</span>
                                </button>
                                <button onClick={() => { alert('Exportar chat'); toggleChatOptions(); }} className="w-full text-left p-3 hover:theme-bg-secondary theme-text-primary transition-colors flex items-center gap-2">
                                    📋 <span>Exportar chat</span>
                                </button>
                                <button onClick={() => { alert('Limpiar chat'); toggleChatOptions(); }} className="w-full text-left p-3 hover:theme-bg-secondary theme-text-primary transition-colors flex items-center gap-2">
                                    🗑️ <span>Limpiar chat</span>
                                </button>
                                <button onClick={() => { alert('Bloquear contacto'); toggleChatOptions(); }} className="w-full text-left p-3 hover:theme-bg-secondary theme-text-primary transition-colors flex items-center gap-2">
                                    🚫 <span>Bloquear contacto</span>
                                </button>
                                <button onClick={() => { alert('Ver información'); toggleChatOptions(); }} className="w-full text-left p-3 hover:theme-bg-secondary theme-text-primary rounded-b-lg transition-colors flex items-center gap-2">
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
                        <button onClick={() => alert('Adjuntar archivo')} className="p-2 rounded-lg theme-bg-chat hover:opacity-80 transition-opacity" title="Adjuntar archivo">📎</button>
                        <button onClick={() => alert('Mostrar emojis')} className="p-2 rounded-lg theme-bg-chat hover:opacity-80 transition-opacity" title="Emojis">😊</button>
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
                            <button onClick={sendMessage} className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-gradient-to-r from-teal-primary to-teal-secondary text-white rounded-full hover:opacity-80 transition-opacity">
                                ➤
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
        </div>
    );
};

export default AguacateChat;