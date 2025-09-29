import React, { useEffect } from 'react';
import CenterNoticeBox from '../common/CenterNoticeBox.jsx';
import ChatImage from './ChatImage.jsx';
import VideoThumbnail from '../common/VideoPlayer.jsx';
import AudioPlayer from '../players/AudioPlayer.jsx';
import MessageRenderer from '../common/MessageRenderer.jsx';

/*
  ChatArea: área scrollable central con mensajes y estados de conversación.
  NOTA: Este es un primer corte de extracción. Aún depende de muchas props.
  Futuras refactorizaciones pueden subdividir (MessageList, MessageBubble, Banners, etc.).
*/
const ChatArea = ({
  // estado/conversación
  currentView,
  selectedContact,
  loadingChatArea,
  isConvBlocked,
  isConversationAccepted,
  isConversationCreator,
  chatMessages,
  // flags de aceptación
  isAcceptingConv,
  isRejectingConv,
  acceptConversation,
  rejectConversation,
  // paginación
  hasMoreOlder,
  loadingOlder,
  loadOlderMessages,
  // refs y handlers de scroll
  chatAreaRef,
  tryMarkVisibleAsSeen,
  recalcReadReceiptPosition,
  // personalización
  personalization,
  isDarkMode,
  // funciones auxiliares
  setMediaGalleryOpen,
  setMediaGalleryIndex,
  openDeleteMessageModal,
  // reply / menú
  messageMenuOpenId,
  messageMenuType,
  setMessageMenuOpenId,
  setMessageMenuType,
  setReplyToMessage,
  // bloqueo
  blockedBy,
  handleToggleConversationBlocked,
  isTogglingBlocked,
  // lectura recibos
  readReceiptTop,
  animateReadReceipt,
  // typing
  isTyping,
  // restricciones creador
  isCreatorSendingLocked,
  // usuario actual
  user,
}) => {
  // Cerrar menú contextual al hacer click en cualquier parte fuera del menú
  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (messageMenuOpenId == null) return; // nada abierto
      if (e.target.closest('.message-menu') || e.target.closest('.menu-trigger')) return; // click dentro del menú o disparador
      try {
        setMessageMenuOpenId(null);
        setMessageMenuType(null);
      } catch {}
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [messageMenuOpenId, setMessageMenuOpenId, setMessageMenuType]);
  return (
    <div
      id="chatArea"
      ref={chatAreaRef}
      className="flex-1 overflow-y-auto p-4 space-y-4 chat-container relative smooth-scroll"
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
                ? { background: '#0d1a26' }
                : { background: '#f8fafc' }
            )
      }
      onScroll={(e) => {
        const el = e.currentTarget;
        if (el.scrollTop <= 80 && hasMoreOlder && !loadingOlder) {
          loadOlderMessages();
        }
        tryMarkVisibleAsSeen && tryMarkVisibleAsSeen();
        recalcReadReceiptPosition && recalcReadReceiptPosition();
      }}
    >
      {/* Estados vacíos / bienvenida */}
      {currentView === 'stories' && !selectedContact && !loadingChatArea && (
        <CenterNoticeBox
          title="Historias"
          message={"Aquí podrás ver y crear historias efímeras que desaparecen en 24 horas. Sube una foto, video o texto creativo para compartir con tus contactos."}
          variant="info"
          className="scale-fade-in"
        />
      )}
      {currentView === 'chats' && !selectedContact && !loadingChatArea && (
        <CenterNoticeBox
          title="¡Bienvenido a AguacaChat 🥑"
          message={"Selecciona una conversación en la izquierda o empieza un nuevo chat para enviar tu primer mensaje."}
          variant="info"
          className="scale-fade-in"
        />
      )}

      {/* Estados iniciales sin mensajes */}
      {selectedContact && chatMessages.length === 0 && !loadingChatArea && !isConvBlocked && !isConversationAccepted && (
        isConversationCreator ? (
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
        )
      )}
      {selectedContact && chatMessages.length === 0 && !loadingChatArea && !isConvBlocked && isConversationAccepted && (
        <CenterNoticeBox
          title="Aún no hay mensajes"
            message={"Empieza la conversación enviando el primer mensaje."}
          variant="neutral"
          className="scale-fade-in"
        />
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

      {/* Lista de mensajes */}
      {selectedContact && !isConvBlocked && chatMessages.length > 0 && (
        <>
          {hasMoreOlder && (
            <div className="w-full flex justify-center">
              <div className="text-xs px-3 py-1 rounded-full theme-bg-chat theme-text-secondary border theme-border">
                {loadingOlder ? 'Cargando mensajes...' : 'Desliza hacia arriba para ver más'}
              </div>
            </div>
          )}
          {chatMessages.map((message, index) => {
            const isOwn = message.type === 'sent';
            const currentDate = message.created_at ? new Date(message.created_at) : null;
            const prevMsg = index > 0 ? chatMessages[index - 1] : null;
            const prevDate = prevMsg?.created_at ? new Date(prevMsg.created_at) : null;
            let showDateDivider = false;
            if (currentDate) {
              if (!prevDate) showDateDivider = true; else {
                const cd = currentDate.getFullYear()+ '-' + currentDate.getMonth() + '-' + currentDate.getDate();
                const pd = prevDate.getFullYear()+ '-' + prevDate.getMonth() + '-' + prevDate.getDate();
                if (cd !== pd) showDateDivider = true;
              }
            }
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
              dateLabel = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
            }
            return (
              <React.Fragment key={index}>
                {showDateDivider && dateLabel && (
                  <div className="w-full flex justify-center py-2 select-none">
                    <div className="px-3 py-1 rounded-full text-xs font-medium theme-bg-chat theme-border theme-text-secondary shadow-sm">{dateLabel}</div>
                  </div>
                )}
                <div
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-center relative`}
                  data-message-id={message.id}
                  data-message-own={isOwn ? '1' : '0'}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (messageMenuOpenId === index && messageMenuType === (isOwn ? 'own' : 'received')) {
                      setMessageMenuOpenId(null);
                      setMessageMenuType(null);
                    } else {
                      setMessageMenuOpenId(index);
                      setMessageMenuType(isOwn ? 'own' : 'received');
                    }
                  }}
                >
                  {/* Avatar recibidos */}
                  {!isOwn && (
                    selectedContact?.avatar_url ? (
                      <img src={selectedContact.avatar_url} alt={selectedContact.name} className="w-10 h-10 rounded-full object-cover mr-2" />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-teal-primary to-teal-secondary rounded-full flex items-center justify-center mr-2">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path></svg>
                      </div>
                    )
                  )}
                  <div
                    className={`${isOwn ? 'message-sent rounded-br-md' : 'message-received rounded-bl-md'} max-w-xs lg:max-w-md rounded-2xl break-words flex flex-col relative theme-text-primary ${['image','video'].includes(message.messageType) ? 'p-1' : 'px-4 py-2'} animate-message-in`}
                    style={{
                      background: isOwn ? personalization.bubbleColors.sent : personalization.bubbleColors.received,
                      fontSize: personalization.fontSize,
                      ['--appear-delay']: `${Math.min(index * 35, 600)}ms`
                    }}
                  >
                    {/* Respuesta a historia */}
                    {message.storyReply && (
                      <div className={`group relative mb-2 w-full overflow-hidden rounded-xl border border-white/10 shadow-sm ${isOwn ? 'reply-bg-sent' : 'reply-bg-received'} bg-black/10 dark:bg-white/5 backdrop-blur-sm`}>
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-teal-400 to-teal-600" />
                        <div className="pl-3 pr-3 py-2 flex items-center gap-3" style={{maskImage:'linear-gradient(to right, black 90%, transparent)'}}>
                          {(() => {
                            const meta = message.storyReply;
                            const ctype = (meta?.contentType || '').toLowerCase();
                            if (ctype === 'image' && meta.contentUrl) return <img src={meta.contentUrl} alt="historia" className="w-10 h-10 object-cover rounded-md border border-white/20 shadow-sm" loading="lazy" />;
                            if (ctype === 'video' && meta.contentUrl) return <div className="relative w-10 h-10 rounded-md overflow-hidden bg-black/40 flex items-center justify-center text-white/80"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>;
                            if (ctype === 'text') {
                              const bg = meta.bg_color || '#111';
                              const fg = meta.font_color || '#fff';
                              return <div className="w-10 h-10 rounded-md flex items-center justify-center text-[9px] font-medium p-1 text-center" style={{background:bg, color:fg, lineHeight:'1.1'}}>{(meta.caption || '').slice(0,24) || 'Texto'}</div>;
                            }
                            return <div className="w-10 h-10 rounded-md bg-black/25 dark:bg-white/10 flex items-center justify-center text-teal-400"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>;
                          })()}
                          <div className="min-w-0 flex-1">
                            <div className="text-[10px] uppercase tracking-wide font-semibold opacity-70 flex items-center gap-1 mb-0.5">Respuesta a historia</div>
                            <div className="text-xs truncate max-w-[210px]" title={message.storyReply.caption || ''}>{message.storyReply.caption ? message.storyReply.caption.slice(0,120) : (message.storyReply.contentType === 'image' ? 'Foto' : message.storyReply.contentType === 'video' ? 'Video' : 'Historia')}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Respuesta estándar */}
                    {message.replyTo && !message.storyReply && (() => {
                      const original = chatMessages.find(m => m.id === message.replyTo);
                      const getLabel = () => {
                        if (!original) return 'Mensaje';
                        if (original.messageType === 'image') return 'Imagen';
                        if (original.messageType === 'video') return 'Video';
                        if (original.messageType === 'audio' || original?.audioUrl) return 'Audio';
                        return (original.text || '(sin contenido)').slice(0,120);
                      };
                      const label = getLabel();
                      const titleText = original ? (original.messageType === 'image' ? 'Imagen' : original.messageType === 'video' ? 'Video' : (original.messageType === 'audio' || original.audioUrl) ? 'Audio' : (original.text || '(sin contenido)')) : 'Mensaje';
                      return (
                        <button
                          type="button"
                          aria-label="Ver mensaje original"
                          className={`group relative mb-2 w-full text-left overflow-hidden rounded-xl border border-white/10/20 dark:border-white/10 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 transition-colors ${isOwn ? 'reply-bg-sent' : 'reply-bg-received'} hover:brightness-105`}
                          onClick={() => {
                            const el = document.querySelector(`[data-message-id='${message.replyTo}']`);
                            if (el) {
                              el.scrollIntoView({behavior:'smooth', block:'center'});
                              el.classList.add('ring-2','ring-teal-400');
                              setTimeout(()=>{ try { el.classList.remove('ring-2','ring-teal-400'); } catch{} }, 1500);
                            }
                          }}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-teal-400 to-teal-600" />
                          <div className="pl-3 pr-2 py-2 flex items-center gap-2 bg-black/5 dark:bg-white/5 backdrop-blur-sm" style={{maskImage:'linear-gradient(to right, black 85%, transparent)'}}>
                            {original && original.messageType === 'image' && (
                              <img src={original.text} alt="miniatura" className="w-8 h-8 object-cover rounded-md border border-white/20 shadow-sm" loading="lazy" />
                            )}
                            {original && original.messageType === 'video' && (
                              <div className="w-8 h-8 rounded-md bg-black/30 dark:bg-white/10 flex items-center justify-center text-teal-400"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></div>
                            )}
                            {original && (original.messageType === 'audio' || original.audioUrl) && (
                              <div className="w-8 h-8 rounded-md bg-black/30 dark:bg-white/10 flex items-center justify-center text-teal-400"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div>
                            )}
                            {!original || ['text', undefined, null].includes(original.messageType) && (
                              <div className="w-8 h-8 rounded-md bg-black/20 dark:bg-white/10 flex items-center justify-center text-teal-400"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] uppercase tracking-wide font-semibold opacity-70 group-hover:opacity-90 flex items-center gap-1">
                                <span>Respuesta a</span>
                              </div>
                              <div className="text-xs truncate max-w-[200px]" title={titleText}>{label}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })()}
                    {/* Contenido mensaje */}
                    {message.messageType === 'image' ? (
                      <div className="relative">
                        <ChatImage
                          src={message.text}
                          alt="Imagen"
                          onClick={() => {
                            const mediaMessages = chatMessages.filter(m => ['image','video'].includes(m.messageType));
                            const idx = mediaMessages.findIndex(m => m === message);
                            if (idx >= 0) {
                              setMediaGalleryIndex(idx);
                              setMediaGalleryOpen(true);
                            }
                          }}
                        />
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-black/55 text-white backdrop-blur-sm leading-none flex items-center gap-1 select-none">
                          {message.created_at ? (function(){ try { return (new Date(message.created_at) && (new Date(message.created_at).toString() !== 'Invalid Date')) ? new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }) : ''; } catch(e){ return ''; } })() : ''}
                        </div>
                      </div>
                    ) : message.messageType === 'video' ? (
                      <div className="relative">
                        <VideoThumbnail
                          src={message.text}
                          loading={!!message.uploading}
                          onOpen={() => {
                            const mediaMessages = chatMessages.filter(m => ['image','video'].includes(m.messageType));
                            const idx = mediaMessages.findIndex(m => m === message);
                            if (idx >= 0) {
                              setMediaGalleryIndex(idx);
                              setMediaGalleryOpen(true);
                            }
                          }}
                          className="!m-0"
                          size={260}
                          radiusClass={`${isOwn ? 'rounded-2xl rounded-br-md' : 'rounded-2xl rounded-bl-md'}`}
                        />
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-black/55 text-white backdrop-blur-sm leading-none flex items-center gap-1 select-none">
                          {message.created_at ? (function(){ try { return (new Date(message.created_at) && (new Date(message.created_at).toString() !== 'Invalid Date')) ? new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }) : ''; } catch(e){ return ''; } })() : ''}
                        </div>
                      </div>
                    ) : (message.messageType === 'audio' || message.audioUrl) ? (
                      <AudioPlayer src={message.audioUrl || message.text} className="w-full max-w-xs" variant="compact" />
                    ) : (
                      <>
                        <MessageRenderer text={message.text} chunkSize={450} />
                        <div className="text-[10px] self-end mt-1">
                          {message.created_at ? (function(){ try { return (new Date(message.created_at) && (new Date(message.created_at).toString() !== 'Invalid Date')) ? new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }) : ''; } catch(e){ return ''; } })() : ''}
                        </div>
                      </>
                    )}
                  </div>
                  {/* Botón menú propios */}
          {isOwn && (
                    <button
            className="menu-trigger absolute -top-1 -right-0 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-teal-500 focus:outline-none"
                      style={{ background: 'transparent', border: 'none', padding: 0 }}
                      title="Más opciones"
                      onClick={() => {
                        if (messageMenuOpenId === index && messageMenuType==='own') {
                          setMessageMenuOpenId(null);
                          setMessageMenuType(null);
                        } else {
                          setMessageMenuOpenId(index);
                          setMessageMenuType('own');
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
                  {/* Menú contextual propios */}
      {isOwn && messageMenuOpenId === index && messageMenuType==='own' && (
                    (() => {
                      const isLastOwn = index === chatMessages.length - 1; // última burbuja enviada por el usuario
                      return (
                        <div
        className={`message-menu absolute w-40 theme-bg-chat theme-border rounded-lg shadow-lg animate-fade-in ${isLastOwn ? 'right-5 bottom-full mb-2' : 'right-5 top-6'} `}
                          style={{ zIndex: 9999 }}
                        >
                      <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-200 rounded-lg" onClick={() => { setReplyToMessage({ id: message.id, text: message.text, messageType: message.messageType }); setMessageMenuOpenId(null); setMessageMenuType(null); }}>Responder</button>
                      <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-200 rounded-lg" onClick={() => { setMessageMenuOpenId(null); setMessageMenuType(null); }}>Ver información</button>
                      <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-200 rounded-lg" onClick={() => { setMessageMenuOpenId(null); setMessageMenuType(null); }}>Fijar mensaje</button>
                      <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-200 rounded-lg" onClick={() => { setMessageMenuOpenId(null); setMessageMenuType(null); }}>Editar mensaje</button>
                      <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-200 rounded-lg" onClick={() => { openDeleteMessageModal(message, true); setMessageMenuOpenId(null); setMessageMenuType(null); }}>Eliminar mensaje</button>
                        </div>
                      );
                    })()
                  )}
                  {/* Menú contextual recibidos */}
                  {!isOwn && messageMenuOpenId === index && messageMenuType==='received' && (
                    <div className="message-menu absolute left-5 top-6 w-40 theme-bg-chat theme-border rounded-lg shadow-lg z-50 animate-fade-in" style={{ zIndex: 9999 }}>
                      <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-200 rounded-lg" onClick={() => { setReplyToMessage({ id: message.id, text: message.text, messageType: message.messageType }); setMessageMenuOpenId(null); setMessageMenuType(null); }}>Responder</button>
                      <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-200 rounded-lg" onClick={() => { try { navigator.clipboard.writeText(message.text || ''); } catch{}; setMessageMenuOpenId(null); setMessageMenuType(null); }}>Copiar</button>
                      <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-200 rounded-lg" onClick={() => { setMessageMenuOpenId(null); setMessageMenuType(null); }}>Fijar</button>
                      <button className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-200 rounded-lg" onClick={() => { openDeleteMessageModal(message, false); setMessageMenuOpenId(null); setMessageMenuType(null); }}>Eliminar</button>
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
          {/* Indicador escribiendo */}
          {selectedContact && isTyping && (
            <div className="flex justify-start">
              {selectedContact?.avatar_url ? (
                <img src={selectedContact.avatar_url} alt={selectedContact.name} className="w-8 h-8 rounded-full object-cover mr-2" />
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
          {/* Banners de aceptación / bloqueo parcial */}
          {!isConversationCreator && !isConversationAccepted && !isConvBlocked && chatMessages.length > 0 && (
            <div className="mt-6 mb-2 w-full flex justify-center">
              <div className="px-4 py-3 rounded-lg text-xs sm:text-sm font-medium flex flex-col sm:flex-row items-stretch sm:items-center gap-3 theme-border border bg-teal-500/10 text-teal-300 backdrop-blur-sm shadow-sm w-full max-w-xl">
                <div className="flex items-center gap-2 flex-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" /></svg>
                  <span className="text-left">Este usuario quiere iniciar una conversación contigo. ¿Deseas aceptarla?</span>
                </div>
                <div className="flex items-center gap-2 sm:justify-end">
                  <button onClick={acceptConversation} disabled={isAcceptingConv} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${isAcceptingConv ? 'opacity-60 cursor-not-allowed bg-teal-600/40' : 'bg-teal-600 hover:bg-teal-500 text-white'}`}>{isAcceptingConv ? 'Aceptando...' : 'Aceptar'}</button>
                  <button onClick={rejectConversation} disabled={isRejectingConv} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${isRejectingConv ? 'opacity-60 cursor-not-allowed bg-rose-600/40' : 'bg-rose-600 hover:bg-rose-500 text-white'}`}>{isRejectingConv ? 'Procesando...' : 'Rechazar'}</button>
                </div>
              </div>
            </div>
          )}
          {isCreatorSendingLocked && !isConvBlocked && (
            <div className="mt-6 mb-2 w-full flex justify-center">
              <div className="px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 theme-border border bg-amber-400/15 text-amber-300 backdrop-blur-sm shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4.99c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z" /></svg>
                <span>Has enviado el primer mensaje. Espera la respuesta para continuar.</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Overlay read receipt */}
      {selectedContact && readReceiptTop != null && (
        <div className={`absolute`} style={{ right: 4, top: readReceiptTop, zIndex: 10, pointerEvents: 'none' }} aria-label="Leído" title="Leído">
          {selectedContact?.avatar_url ? (
            <img src={selectedContact.avatar_url} alt={`Leído por ${selectedContact.name || 'contacto'}`} className={`w-5 h-5 rounded-full shadow read-receipt ${animateReadReceipt ? 'read-receipt-animate' : ''}`} style={{ border: '2px solid', borderColor: 'var(--bg-secondary)' }} />
          ) : (
            <div className={`w-5 h-5 rounded-full bg-gradient-to-br from-teal-primary to-teal-secondary shadow flex items-center justify-center text-[10px] text-white font-bold read-receipt ${animateReadReceipt ? 'read-receipt-animate' : ''}`} style={{ border: '2px solid', borderColor: 'var(--bg-secondary)' }}>
              {selectedContact?.initials?.slice(0,2) || '•'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatArea;
