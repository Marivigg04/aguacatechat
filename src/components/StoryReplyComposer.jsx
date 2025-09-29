import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, PhotoIcon, MicrophoneIcon, XMarkIcon } from '@heroicons/react/24/solid';
import EmojiPicker from './chat/EmojiPicker';
import { uploadAudioToBucket, uploadVideoToBucket } from '../services/db';
import supabase from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';

/**
 * StoryReplyComposer
 * Props:
 *  - storyOwnerId: id del usuario dueño de la historia
 *  - storyId: id de la historia (para referencia futura)
 *  - onClose(): cerrar el panel
 *  - onSent(messagePayload): callback tras enviar
 *  - ensureConversation(ownerId): Promise<{ conversationId }>
 *  - storyData: objeto crudo de la historia (para extraer miniatura, tipo, caption, colores)
 */
const StoryReplyComposer = ({ storyOwnerId, storyId, storyData, onClose, onSent, ensureConversation }) => {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiBtnRef = useRef(null);
  const textRef = useRef(null);
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null); // { type: 'image'|'video', file, url }
  const [audioBlob, setAudioBlob] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => { if (textRef.current) textRef.current.focus(); }, []);

  const handleSelectEmoji = (emoji) => {
    setText(prev => {
      const next = (prev + emoji).slice(0, 500);
      return next;
    });
  };

  const startRecording = async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setIsRecording(true);
    } catch (e) {
      console.error('No se pudo iniciar grabación', e);
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    try { mediaRecorderRef.current?.stop(); } catch {}
    setIsRecording(false);
  };

  const cancelAudio = () => {
    setAudioBlob(null);
    if (isRecording) stopRecording();
  };

  const handlePickFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) { alert('Formato no soportado'); return; }
    const url = URL.createObjectURL(file);
    setPreview({ type: isImage ? 'image' : 'video', file, url });
    e.target.value = '';
  };

  const clearPreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const canSend = !sending && (text.trim() || preview || audioBlob);

  const send = async () => {
    if (!canSend || !user) return;
    setSending(true);
    try {
      const { conversationId } = await ensureConversation(storyOwnerId);
  let content = text.trim();
  // Tipo real del contenido que el usuario está enviando dentro de la respuesta (text/image/video/audio)
  let innerContentType = 'text';
      let mediaUrl = null;
      if (preview) {
        if (preview.type === 'image') {
          // Subir imagen al bucket 'chatimages'
          const ext = preview.file.name.split('.').pop() || 'jpg';
          const path = `${user.id}/${conversationId}/story-reply-${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage.from('chatimages').upload(path, preview.file, { upsert: false, contentType: preview.file.type });
          if (upErr) throw upErr;
          const { data: pub } = supabase.storage.from('chatimages').getPublicUrl(path);
            mediaUrl = pub?.publicUrl;
            type = 'image';
        } else if (preview.type === 'video') {
          const { publicUrl } = await uploadVideoToBucket({ file: preview.file, userId: user.id, conversationId, bucket: 'chatvideos' });
          mediaUrl = publicUrl;
          innerContentType = 'video';
        }
      }
      if (audioBlob) {
  const { publicUrl } = await uploadAudioToBucket({ blob: audioBlob, conversationId, userId: user.id });
  mediaUrl = publicUrl;
  innerContentType = 'audio';
      }
      // Construir metadata de historia respondida
      let storyMeta = null;
      try {
        if (storyData && typeof storyData === 'object') {
            storyMeta = {
            storyId: storyId,
            ownerId: storyOwnerId,
            contentType: storyData.content_type || storyData.type || (storyData.caption ? (storyData.content_type || 'image') : storyData.type) || 'image',
            contentUrl: storyData.content_url || storyData.url || storyData.media_url || null,
            caption: storyData.caption || storyData.text || null,
            bg_color: storyData.bg_color || storyData.bgColor || null,
            font_color: storyData.font_color || storyData.textColor || null,
              replyContentType: innerContentType,
          };
        }
      } catch {}
      // Nuevo requerimiento: eliminar prefijo de metadata, solo guardar el texto del usuario o URL media.
      // Conservamos metadata en memoria para callback onSent si se requiere en UI, pero NO se persiste en content.
      const finalContent = mediaUrl || content || ' ';
      // Guardar type='stories' y replyng_to=storyId para poder reconstruir metadata luego (buscando la historia por id)
    const payload = { conversationId, senderId: user.id, content: finalContent, type: 'stories', replyng_to: storyId, _storyMeta: storyMeta };
    // Persistimos story_meta oculto en la fila (nuevo requerimiento)
    const { insertMessage } = await import('../services/db');
    await insertMessage({ conversationId, senderId: user.id, content: payload.content, type: payload.type, replyng_to: payload.replyng_to, story_meta: storyMeta });
      onSent?.(payload);
      setText('');
      clearPreview();
      cancelAudio();
      onClose?.();
    } catch (e) {
      console.error('Error enviando respuesta de historia', e);
      alert('No se pudo enviar la respuesta');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="absolute inset-x-0 bottom-0 p-3 pointer-events-none">
      <div className="pointer-events-auto bg-black/70 backdrop-blur-md border border-white/15 rounded-2xl p-3 flex flex-col gap-3 animate-[fadeIn_.25s_ease]">
        <div className="flex items-start gap-3">
          <button
            ref={emojiBtnRef}
            onClick={() => setShowEmoji(v => !v)}
            className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
            title="Emojis"
            type="button"
          >😊</button>
          <div className="flex-1 flex flex-col gap-2">
            {preview && (
              <div className="relative group max-w-[220px]">
                {preview.type === 'image' ? (
                  <img src={preview.url} alt="preview" className="rounded-lg max-h-40 object-cover" />
                ) : (
                  <video src={preview.url} className="rounded-lg max-h-40" controls />
                )}
                <button onClick={clearPreview} className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center"><XMarkIcon className="w-4 h-4" /></button>
              </div>
            )}
            {audioBlob && !preview && (
              <div className="flex items-center gap-3 bg-white/10 rounded-lg px-3 py-2 text-white text-xs">
                <span>Audio listo</span>
                <button onClick={cancelAudio} className="text-red-300 hover:text-red-200">Cancelar</button>
              </div>
            )}
            {!audioBlob && !preview && (
              <textarea
                ref={textRef}
                value={text}
                onChange={(e) => setText(e.target.value.slice(0,500))}
                placeholder="Responder a la historia..."
                rows={1}
                className="w-full resize-none bg-white/10 focus:bg-white/15 border border-white/15 focus:border-teal-400/50 rounded-xl px-3 py-2 text-sm text-white placeholder-white/50 outline-none max-h-40 overflow-y-auto custom-scrollbar"
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              />
            )}
            {isRecording && (
              <div className="text-xs text-teal-200">Grabando... (pulsa de nuevo el micrófono para terminar)</div>
            )}
            <div className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => fileInputRef.current?.click()} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 text-white" title="Adjuntar imagen/video" type="button"><PhotoIcon className="w-5 h-5" /></button>
                {!audioBlob && (
                  <button
                    onClick={() => (isRecording ? stopRecording() : startRecording())}
                    className={`w-9 h-9 flex items-center justify-center rounded-full ${isRecording ? 'bg-red-500/70 hover:bg-red-500' : 'bg-white/15 hover:bg-white/25'} text-white`}
                    title={isRecording ? 'Detener grabación' : 'Grabar audio'}
                    type="button"
                  ><MicrophoneIcon className="w-5 h-5" /></button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={!canSend}
                  onClick={send}
                  className={`px-4 h-9 rounded-full text-sm font-semibold flex items-center gap-2 transition-colors ${canSend ? 'bg-teal-500 hover:bg-teal-400 text-white' : 'bg-white/10 text-white/40 cursor-not-allowed'}`}
                  type="button"
                >
                  <span>Enviar</span>
                  <PaperAirplaneIcon className="w-4 h-4 -rotate-45" />
                </button>
                <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white" title="Cerrar" type="button"><XMarkIcon className="w-5 h-5" /></button>
              </div>
            </div>
          </div>
        </div>
        {showEmoji && (
          <EmojiPicker
            dark
            anchorRef={emojiBtnRef}
            onSelect={(e) => { handleSelectEmoji(e); setShowEmoji(false); }}
            onClose={() => setShowEmoji(false)}
          />
        )}
      </div>
      <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handlePickFile} />
    </div>
  );
};

export default StoryReplyComposer;
