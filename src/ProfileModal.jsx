import React, { useState } from 'react';
import Lottie from 'react-lottie';
import { FaEye, FaEyeSlash, FaPen } from 'react-icons/fa';
import { supabase } from './services/supabaseClient';
import { useAuth } from './context/AuthContext.jsx'
import { useNavigate } from 'react-router-dom'

const ProfileModal = ({
    showProfileModal,
    setShowProfileModal,
    myProfile,
    contactProfile = null, // Nuevo: si se pasa, mostrar perfil de contacto en modo lectura
    isEditingName,
    setIsEditingName,
    newProfileName,
    setNewProfileName,
    isEditProfilePaused,
    setEditProfilePaused,
    isEditProfileStopped,
    setEditProfileStopped,
    isInfoProfilePaused,
    setInfoProfilePaused,
    isInfoProfileStopped,
    setInfoProfileStopped,
    lottieOptions,
    setPhotoProfilePaused,
    setPhotoProfileStopped,
    isPhotoProfilePaused,
    isPhotoProfileStopped,
    setTypingProfilePaused,
    setTypingProfileStopped,
    isTypingProfilePaused,
    isTypingProfileStopped,
    setLockProfilePaused,
    setLockProfileStopped,
    isLockProfilePaused,
    isLockProfileStopped
}) => {
    // Estados locales para edición de información de perfil
    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [newProfileInfo, setNewProfileInfo] = useState('');
    const { signOut, user } = useAuth();
    const navigate = useNavigate();
    
    // Estados locales para la ventana de cambiar contraseña
    const [showEditPasswordModal, setShowEditPasswordModal] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Estado para controlar animaciones de salida
    const [isClosing, setIsClosing] = useState(false);

    // Estado para la info de perfil desde Supabase
    const [profileInfoDb, setProfileInfoDb] = useState('');
    const [loadingContactInfo, setLoadingContactInfo] = useState(false);
    // Estado y ref para la foto de perfil local (vista previa), url remota y selector de archivos
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const fileInputRef = React.useRef(null);

    // Helpers: validación, recorte y utilidades de imagen
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const TARGET_SIZE = 512;

    function extractPathFromPublicUrl(url) {
        if (!url) return null;
        const marker = '/userphotos/';
        const idx = url.lastIndexOf(marker);
        if (idx === -1) return null;
        return url.substring(idx + marker.length);
    }

    function validateFile(file) {
        if (file.size > MAX_FILE_SIZE) {
            return 'La imagen supera el tamaño máximo de 5MB';
        }
        if (!ALLOWED_TYPES.includes(file.type)) {
            return 'Formato no permitido. Usa JPG, PNG o WebP';
        }
        return null;
    }

    async function processImageToSquare(file, size = TARGET_SIZE) {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        try {
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = objectUrl;
            });
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            const minSide = Math.min(img.width, img.height);
            const sx = (img.width - minSide) / 2;
            const sy = (img.height - minSide) / 2;
            ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

            const mime = 'image/webp';
            const ext = 'webp';
            const blob = await new Promise((resolve) => {
                canvas.toBlob((b) => resolve(b), mime, 0.9);
            });
            const previewUrl = URL.createObjectURL(blob);
            return { blob, mime, ext, previewUrl };
        } finally {
            URL.revokeObjectURL(objectUrl);
        }
    }

    // Función para cerrar el modal con animación
    const handleCloseModal = () => {
        setIsClosing(true);
        setTimeout(() => {
            setShowProfileModal(false);
            setIsClosing(false);
        }, 400);
    };

    React.useEffect(() => {
        // Si es perfil de contacto (modo lectura) intentar usar datos proporcionados y si faltan, consultar DB
        if (contactProfile) {
            if (import.meta.env?.DEV) {
                console.debug('[ProfileModal] contactProfile recibido', contactProfile);
            }
            setProfileInfoDb(contactProfile.profileInformation); // sin fallback
            setAvatarUrl(contactProfile.avatar_url || null);
            // Obtener el nombre desde profiles.username via fetch
            setProfileName('Cargando...');
            // Fetch explícito si viene undefined (no fue incluido en el bulk select)
            if (typeof contactProfile.profileInformation === 'undefined' && contactProfile.id) {
                (async () => {
                    try {
                        const { selectFrom } = await import('./services/db');
                        const data = await selectFrom('profiles', {
                            columns: 'profileInformation',
                            match: { id: contactProfile.id },
                            single: true
                        });
                        if (import.meta.env?.DEV) console.debug('[ProfileModal] fetch puntual contacto data=', data);
                        setProfileInfoDb(data?.profileInformation ?? null);
                    } catch (e) {
                        if (import.meta.env?.DEV) console.warn('[ProfileModal] Error fetch puntual contacto', e);
                    }
                })();
            }
            // Siempre hacer fetch para obtener username desde profiles
            const contactId = contactProfile.id || contactProfile.profileId;
            // Antes se usaba una variable inexistente "baseInfo" que causaba ReferenceError.
            // Usamos profileInfoDb (estado) para decidir si hace falta completar datos del contacto.
            if (!profileInfoDb && contactId && showProfileModal) {
                (async () => {
                    setLoadingContactInfo(true);
                    try {
                        const { selectFrom } = await import('./services/db');
                        const data = await selectFrom('profiles', {
                            columns: 'profileInformation, avatar_url, username',
                            match: { id: contactId },
                            single: true
                        });
                        if (data) {
                            setProfileInfoDb(data.profileInformation || '');
                            if (data.avatar_url) setAvatarUrl(data.avatar_url);
                            // Usar username de profiles
                            setProfileName(data.username || 'Contacto');
                        }
                    } catch (err) {
                        // Silencioso, se mostrará fallback
                        setProfileName('Contacto');
                    } finally {
                        setLoadingContactInfo(false);
                    }
                })();
            }
            return;
        }
        async function fetchProfileInfo() {
            if (!user?.id || !showProfileModal) return;
            try {
                const { selectFrom } = await import('./services/db');
                const data = await selectFrom('profiles', {
                    columns: 'profileInformation, avatar_url, username',
                    match: { id: user.id },
                    single: true
                });
                if (import.meta.env?.DEV) {
                    console.debug('[ProfileModal] fetch propio perfil data=', data);
                }
                setProfileInfoDb(data?.profileInformation ?? null);
                setAvatarUrl(data?.avatar_url || null);
                setProfileName(data?.username || myProfile.name);
            } catch (err) {
                if (import.meta.env?.DEV) {
                    console.warn('[ProfileModal] Error fetch propio perfil', err);
                }
                setProfileInfoDb(null);
                setAvatarUrl(null);
                setProfileName(myProfile.name);
            }
        }
        fetchProfileInfo();
    }, [user?.id, showProfileModal, contactProfile]);

    // Estado local para mostrar el nombre en el modal
    const [profileName, setProfileName] = useState('Cargando...');

    React.useEffect(() => {
        if (contactProfile) {
            // Para contactos, el nombre se obtiene del fetch en el useEffect anterior
            // No hacer nada aquí para evitar sobrescribir
        } else {
            // Para perfil propio, el nombre se obtiene del fetchProfileInfo
            // No sobrescribir aquí
        }
    }, [myProfile.name, contactProfile]);

    // Agregar una referencia para evitar llamadas duplicadas al guardar
    const isSavingRef = React.useRef(false);

    // Función para actualizar el nombre de usuario en la base de datos
    async function handleSaveProfileName() {
        if (!user?.id || isSavingRef.current) return;
        isSavingRef.current = true;
        try {
            const { updateTable } = await import('./services/db');
            await updateTable('profiles', { id: user.id }, { username: newProfileName });
            setProfileName(newProfileName);
            setIsEditingName(false);
            if (window.toast) window.toast.success('Nombre actualizado');
            else { 
                try { 
                    const { default: toast } = await import('react-hot-toast'); 
                    toast.success('Nombre actualizado'); 
                } catch {}
            }
        } catch (err) {
            if (window.toast) window.toast.error('Error al actualizar el nombre');
            else { 
                try { 
                    const { default: toast } = await import('react-hot-toast'); 
                    toast.error('Error al actualizar el nombre'); 
                } catch {}
            }
        } finally {
            isSavingRef.current = false;
        }
    }

    // Renderizar solo si el modal debe mostrarse o está cerrándose
    if (!showProfileModal && !isClosing) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4"
            onClick={handleCloseModal}
            style={{
                animation: isClosing ? 'fadeOut 0.3s ease-in forwards' : 'fadeIn 0.3s ease-out forwards'
            }}
        >
            <div
                className={`theme-bg-secondary rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl
                    transition-all duration-700
                    ${isClosing 
                        ? 'opacity-0 scale-90 translate-y-8' 
                        : 'opacity-100 scale-100 translate-y-0'
                    }
                `}
                style={{
                    transitionProperty: 'opacity, transform',
                    transitionTimingFunction: 'cubic-bezier(0.25, 1, 0.5, 1)',
                    animation: isClosing
                        ? 'slideOutRight 0.4s ease-in forwards'
                        : 'slideInLeft 0.4s ease-out forwards'
                }}
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6 theme-border border-b flex items-center justify-between relative">
                    <h3 className="text-xl font-bold theme-text-primary">{contactProfile ? 'Perfil del contacto' : 'Perfil'}</h3>
                    <button
                        onClick={handleCloseModal}
                        className={`
                            ml-4 w-10 h-10 rounded-full flex items-center justify-center
                            transition-all duration-300 ease-out transform hover:scale-110 hover:rotate-90
                            theme-bg-chat ring-1 ring-white/10 hover:ring-white/20
                        `}
                        title="Cerrar modal"
                        style={{ zIndex: 10 }}
                    >
                        <span className="text-lg font-light transition-colors duration-300 theme-text-primary">✕</span>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                    {/* Botón avatar con overlay de lápiz en hover y selector de imagen */}
                    <div className="flex flex-col items-center mb-4">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file || !user?.id) return;

                                const errorMsg = validateFile(file);
                                if (errorMsg) {
                                    if (window.toast) window.toast.error(errorMsg);
                                    else {
                                        try { const { default: toast } = await import('react-hot-toast'); toast.error(errorMsg); } catch {}
                                    }
                                    return;
                                }

                                if (avatarPreview) URL.revokeObjectURL(avatarPreview);
                                let processed;
                                try {
                                    processed = await processImageToSquare(file);
                                } catch (err) {
                                    if (window.toast) window.toast.error('No se pudo procesar la imagen');
                                    else { try { const { default: toast } = await import('react-hot-toast'); toast.error('No se pudo procesar la imagen'); } catch {} }
                                    return;
                                }
                                const { blob, mime, ext, previewUrl } = processed;
                                setAvatarPreview(previewUrl);
                                setUploadingAvatar(true);
                                try {
                                    const { data: sessRes } = await supabase.auth.getSession();
                                    const authUid = sessRes?.session?.user?.id || null;
                                    if (!authUid) {
                                        const msg = 'No hay sesión activa. Inicia sesión para actualizar tu foto.';
                                        if (window.toast) window.toast.error(msg); else { try { const { default: toast } = await import('react-hot-toast'); toast.error(msg); } catch {}
                                        }
                                        throw new Error('Missing auth session');
                                    }

                                    const oldPath = extractPathFromPublicUrl(avatarUrl);
                                    const fileName = `${Date.now()}.${ext}`;
                                    const path = `${authUid}/${fileName}`;
                                    if (import.meta.env?.DEV) {
                                        console.debug('[Avatar] Subiendo a', { bucket: 'userphotos', path, mime, authUid, userId: user?.id });
                                    }
                                    
                                    const { error: uploadError } = await supabase.storage
                                        .from('userphotos')
                                        .upload(path, blob, { upsert: true, contentType: mime, cacheControl: '31536000' });
                                    if (uploadError) {
                                        const firstSeg = path.split('/')[0];
                                        const details = `UID=${authUid} | path=${path} | firstSeg=${firstSeg}`;
                                        if (window.toast) window.toast.error(`No se pudo subir la imagen. ${details}`);
                                        else { try { const { default: toast } = await import('react-hot-toast'); toast.error(`No se pudo subir la imagen. ${details}`); } catch {} }
                                        if (import.meta.env?.DEV) {
                                            console.error('[Avatar] Error en upload:', uploadError, { authUid, path, firstSeg });
                                        }
                                        throw uploadError;
                                    }

                                    const { data: publicData, error: pubErr } = supabase.storage
                                        .from('userphotos')
                                        .getPublicUrl(path);
                                    if (pubErr) {
                                        if (import.meta.env?.DEV) {
                                            console.error('[Avatar] Error obteniendo URL pública:', pubErr);
                                        }
                                        throw pubErr;
                                    }
                                    const publicUrl = publicData.publicUrl;

                                    const { data: sess2 } = await supabase.auth.getSession();
                                    const profileId = sess2?.session?.user?.id || user?.id;
                                    const { updateTable } = await import('./services/db');
                                    await updateTable('profiles', { id: profileId }, { avatar_url: publicUrl });

                                    if (previewUrl) URL.revokeObjectURL(previewUrl);
                                    setAvatarPreview(null);
                                    setAvatarUrl(publicUrl);
                                    try {
                                        window.dispatchEvent(new CustomEvent('profile:avatar-updated', { detail: publicUrl }));
                                    } catch {}

                                    if (oldPath) {
                                        try {
                                            await supabase.storage.from('userphotos').remove([oldPath]);
                                        } catch (delErr) {
                                            console.warn('No se pudo eliminar la imagen anterior:', delErr);
                                        }
                                    }

                                    if (window.toast) window.toast.success('Foto actualizada');
                                    else {
                                        try {
                                            const { default: toast } = await import('react-hot-toast');
                                            toast.success('Foto actualizada');
                                        } catch {}
                                    }

                                    if (typeof myProfile?.onPhotoSelected === 'function') {
                                        try { myProfile.onPhotoSelected(file, publicUrl); } catch {}
                                    }
                                } catch (err) {
                                    const details = err?.message || err?.error?.message || String(err);
                                    const msgBase = 'No se pudo actualizar la foto';
                                    const msg = import.meta.env?.DEV ? `${msgBase}: ${details}` : msgBase;
                                    if (window.toast) window.toast.error(msg);
                                    else {
                                        try {
                                            const { default: toast } = await import('react-hot-toast');
                                            toast.error(msg);
                                        } catch {}
                                    }
                                    console.error('[Avatar] Error completo:', err);
                                } finally {
                                    setUploadingAvatar(false);
                                }
                            }}
                        />
                        {!contactProfile && (
                        <button
                            type="button"
                            className="relative group w-32 h-32 rounded-full bg-gradient-to-br from-teal-primary to-teal-secondary text-white flex items-center justify-center shadow-lg overflow-hidden"
                            onClick={() => fileInputRef.current?.click()}
                            title="Cambiar foto de perfil"
                        >
                            {avatarPreview || avatarUrl ? (
                                <img src={avatarPreview || avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <span className="font-bold text-5xl select-none">{myProfile.initials}</span>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <FaPen className="text-white text-2xl" />
                            </div>
                            {uploadingAvatar && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <span className="text-white text-sm">Subiendo...</span>
                                </div>
                            )}
                        </button>
                        )}
                        {contactProfile && (
                            <div className="relative w-32 h-32 rounded-full overflow-hidden shadow-lg flex items-center justify-center bg-gradient-to-br from-teal-primary to-teal-secondary">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt={profileName} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="font-bold text-5xl select-none">{(contactProfile.initials) || '👤'}</span>
                                )}
                            </div>
                        )}
                        {/* Nombre y edición con transición suave */}
                        <div className="w-full flex flex-col items-center mt-5">
                            <div className={`transition-all duration-300 w-full`}>
                                {isEditingName && !contactProfile ? (
                                    <form
                                        className="flex flex-col items-center gap-2 w-full"
                                        onSubmit={e => {
                                            e.preventDefault();
                                            if (newProfileName.trim()) {
                                                handleSaveProfileName();
                                            }
                                        }}
                                    >
                                        <input
                                            id="profileNameInput"
                                            type="text"
                                            className="p-1 w-full rounded-lg theme-bg-chat theme-text-primary theme-border border focus:outline-none focus:ring-2 focus:ring-teal-primary"
                                            value={newProfileName}
                                            onChange={e => {
                                                const soloLetrasEspacios = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]/g, '');
                                                setNewProfileName(soloLetrasEspacios.slice(0, 40));
                                            }}
                                            onBlur={() => {
                                                if (newProfileName.trim()) {
                                                    handleSaveProfileName();
                                                } else {
                                                    setIsEditingName(false);
                                                }
                                            }}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    if (newProfileName.trim()) handleSaveProfileName();
                                                }
                                                if (e.key === 'Escape') {
                                                    setNewProfileName(profileName);
                                                    setIsEditingName(false);
                                                }
                                            }}
                                            autoFocus
                                            maxLength={40}
                                        />
                                        <div className="flex gap-2 mt-1">
                                            <button
                                                type="submit"
                                                className="p-1 rounded-lg bg-gradient-to-r from-teal-primary to-teal-secondary text-white font-semibold hover:opacity-90 transition-opacity"
                                                title="Guardar"
                                            >
                                                Guardar
                                            </button>
                                            <button
                                                type="button"
                                                className="p-1 rounded-lg theme-bg-chat theme-text-primary theme-border border"
                                                onClick={() => {
                                                    setNewProfileName(profileName);
                                                    setIsEditingName(false);
                                                }}
                                                title="Cancelar"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="flex items-center gap-4 justify-center">
                                        <span className="font-semibold theme-text-primary text-3xl">{profileName}</span>
                                        {!contactProfile && (
                                            <div
                                                className="w-7 h-7"
                                                onClick={() => {
                                                    setIsEditingName(true);
                                                    setTimeout(() => {
                                                        document.getElementById('profileNameInput')?.focus();
                                                    }, 100);
                                                }}
                                                onMouseEnter={() => {
                                                    setEditProfileStopped(true);
                                                    setTimeout(() => {
                                                        setEditProfileStopped(false);
                                                        setEditProfilePaused(false);
                                                    }, 10);
                                                }}
                                                onMouseLeave={() => setEditProfilePaused(true)}
                                                style={{ cursor: 'pointer' }}
                                                title="Cambiar nombre del perfil"
                                            >
                                                <Lottie options={lottieOptions.editProfile} isPaused={isEditProfilePaused} isStopped={isEditProfileStopped} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* Información del perfil editable */}
                    <div className="flex flex-col gap-1 mb-2">
                        <span className="text-sm theme-text-secondary">Información del perfil:</span>
                        <div className={`transition-all duration-300 w-full`}>
                            {isEditingInfo && !contactProfile ? (
                                <form
                                    className="flex flex-col items-center gap-2 w-full"
                                    onSubmit={async e => {
                                        e.preventDefault();
                                        if (newProfileInfo.trim()) {
                                            try {
                                                const { updateTable } = await import('./services/db');
                                                const trimmed = newProfileInfo.trim().slice(0, 80);
                                                await updateTable('profiles', { id: user.id }, { profileInformation: trimmed });
                                                setProfileInfoDb(trimmed);
                                                if (window.toast) window.toast.success('Información actualizada');
                                                else {
                                                    const { default: toast } = await import('react-hot-toast');
                                                    toast.success('Información actualizada');
                                                }
                                            } catch (err) {
                                                if (window.toast) window.toast.error('Error al guardar');
                                                else {
                                                    const { default: toast } = await import('react-hot-toast');
                                                    toast.error('Error al guardar');
                                                }
                                            }
                                            setIsEditingInfo(false);
                                        }
                                    }}
                                >
                                    <div className="w-full flex flex-col gap-1">
                                        <textarea
                                            id="profileInfoInput"
                                            className="p-2 w-full rounded-lg theme-bg-chat theme-text-primary theme-border border focus:outline-none focus:ring-2 focus:ring-teal-primary font-semibold resize-none leading-snug"
                                            value={newProfileInfo}
                                            maxLength={80}
                                            rows={1}
                                            onChange={e => {
                                                const val = e.target.value.slice(0, 80);
                                                setNewProfileInfo(val);
                                                // Auto-resize
                                                const el = e.target;
                                                el.style.height = 'auto';
                                                el.style.height = Math.min(el.scrollHeight, 140) + 'px';
                                            }}
                                            onFocus={e => {
                                                if (e.target.value === '' || e.target.value === undefined) {
                                                    setNewProfileInfo('');
                                                }
                                                // Ajuste inicial altura
                                                const el = e.target;
                                                requestAnimationFrame(() => {
                                                    el.style.height = 'auto';
                                                    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
                                                });
                                            }}
                                            onBlur={async () => {
                                                if (newProfileInfo.trim()) {
                                                    try {
                                                        const { updateTable } = await import('./services/db');
                                                        const trimmed = newProfileInfo.trim().slice(0, 80);
                                                        await updateTable('profiles', { id: user.id }, { profileInformation: trimmed });
                                                        setProfileInfoDb(trimmed);
                                                    } catch {}
                                                }
                                                setIsEditingInfo(false);
                                            }}
                                            onKeyDown={async e => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    if (newProfileInfo.trim()) {
                                                        try {
                                                            const { updateTable } = await import('./services/db');
                                                            const trimmed = newProfileInfo.trim().slice(0, 80);
                                                            await updateTable('profiles', { id: user.id }, { profileInformation: trimmed });
                                                            setProfileInfoDb(trimmed);
                                                        } catch {}
                                                    }
                                                    setIsEditingInfo(false);
                                                } else if (e.key === 'Escape') {
                                                    setNewProfileInfo(profileInfoDb || '');
                                                    setIsEditingInfo(false);
                                                }
                                            }}
                                            autoFocus
                                        />
                                        <div className="flex justify-between text-[11px] px-1 select-none">
                                            <span className="theme-text-secondary">Enter: guardar | Shift+Enter: salto</span>
                                            <span className={newProfileInfo.length >= 80 ? 'text-red-500 font-medium' : 'theme-text-secondary'}>
                                                {80 - newProfileInfo.length} restantes
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-1">
                                        <button
                                            type="submit"
                                            className="p-1 rounded-lg bg-gradient-to-r from-teal-primary to-teal-secondary text-white font-semibold hover:opacity-90 transition-opacity"
                                            title="Guardar"
                                        >
                                            Guardar
                                        </button>
                                        <button
                                            type="button"
                                            className="p-1 rounded-lg theme-bg-chat theme-text-primary theme-border border"
                                            onClick={() => {
                                                setNewProfileInfo(profileInfoDb);
                                                setIsEditingInfo(false);
                                            }}
                                            title="Cancelar"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="flex items-center gap-2 w-full">
                                    <span className="theme-text-primary text-base flex-1 font-semibold">
                                        {typeof profileInfoDb === 'string' && profileInfoDb.trim() !== ''
                                            ? profileInfoDb
                                            : <span className="theme-text-primary font-semibold">Sin información</span>}
                                    </span>
                                    {!contactProfile && (
                                        <div
                                            className="w-7 h-7"
                                            onClick={() => {
                                                setNewProfileInfo(profileInfoDb || '');
                                                setIsEditingInfo(true);
                                                setTimeout(() => {
                                                    document.getElementById('profileInfoInput')?.focus();
                                                }, 100);
                                            }}
                                            onMouseEnter={() => {
                                                setInfoProfileStopped(true);
                                                setTimeout(() => {
                                                    setInfoProfileStopped(false);
                                                    setInfoProfilePaused(false);
                                                }, 10);
                                            }}
                                            onMouseLeave={() => setInfoProfilePaused(true)}
                                            style={{ cursor: 'pointer' }}
                                            title="Editar información del perfil"
                                        >
                                            <Lottie options={lottieOptions.infoProfile} isPaused={isInfoProfilePaused} isStopped={isInfoProfileStopped} />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Botón cambiar contraseña (solo perfil propio) */}
                    {!contactProfile && (
                    <button
                        className="flex items-center gap-2 p-2 rounded transition-colors"
                        onClick={() => setShowEditPasswordModal(true)}
                        onMouseEnter={() => {
                            setTypingProfileStopped(true);
                            setTimeout(() => {
                                setTypingProfileStopped(false);
                                setTypingProfilePaused(false);
                            }, 10);
                        }}
                        onMouseLeave={() => setTypingProfilePaused(true)}
                    >
                        <div className="w-7 h-7">
                            <Lottie options={lottieOptions.typingProfile} isPaused={isTypingProfilePaused} isStopped={isTypingProfileStopped} />
                        </div>
                        <span className="theme-text-primary">Cambiar contraseña</span>
                    </button>
                    )}
                    {/* Botón Cerrar sesión (solo perfil propio) */}
                    {!contactProfile && (
                    <div className="flex justify-center mt-2">
                        <button
                            className="flex items-center gap-2 px-3 py-1 rounded transition-colors bg-gradient-to-r from-teal-primary to-teal-secondary text-white font-semibold hover:opacity-90"
                            style={{ fontSize: '0.95rem', minWidth: '120px' }}
                            onClick={async () => {
                                await signOut();
                                handleCloseModal();
                                navigate('/login');
                            }}
                            onMouseEnter={() => {
                                setLockProfileStopped(true);
                                setTimeout(() => {
                                    setLockProfileStopped(false);
                                    setLockProfilePaused(false);
                                }, 10);
                            }}
                            onMouseLeave={() => setLockProfilePaused(true)}
                        >
                            <div className="w-6 h-6">
                                <Lottie options={lottieOptions.lockProfile} isPaused={isLockProfilePaused} isStopped={isLockProfileStopped} />
                            </div>
                            <span className="font-semibold">Cerrar sesión</span>
                        </button>
                    </div>
                    )}
                </div>
            </div>
            {/* Modal cambiar contraseña */}
            {showEditPasswordModal && !contactProfile && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="theme-bg-secondary rounded-2xl w-full max-w-xs flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-4 theme-border border-b flex items-center justify-between">
                            <h3 className="text-lg font-bold theme-text-primary">Cambiar contraseña</h3>
                            <button
                                onClick={() => setShowEditPasswordModal(false)}
                                className={`
                                    ml-4 w-10 h-10 rounded-full flex items-center justify-center
                                    transition-all duration-300 ease-out transform hover:scale-110 hover:rotate-90
                                    theme-bg-chat ring-1 ring-white/10 hover:ring-white/20
                                `}
                                title="Cerrar modal"
                                style={{ zIndex: 10 }}
                            >
                                <span className="text-lg font-light transition-colors duration-300 theme-text-primary">✕</span>
                            </button>
                        </div>
                        <form
                            className="flex flex-col gap-3 p-4"
                            onSubmit={e => {
                                e.preventDefault();
                                if (
                                    newPassword.length < 8 ||
                                    newPassword.length > 32 ||
                                    confirmPassword.length < 8 ||
                                    confirmPassword.length > 32
                                ) {
                                    alert('La contraseña debe tener entre 8 y 32 caracteres');
                                    return;
                                }
                                if (newPassword && newPassword === confirmPassword) {
                                    alert('Contraseña cambiada correctamente');
                                    setCurrentPassword('');
                                    setNewPassword('');
                                    setConfirmPassword('');
                                    setShowEditPasswordModal(false);
                                } else {
                                    alert('Las contraseñas no coinciden');
                                }
                            }}
                        >
                            <div className="relative">
                                <input
                                    type={showCurrentPassword ? "text" : "password"}
                                    placeholder="Contraseña actual"
                                    className="p-2 pr-10 rounded-lg theme-bg-chat theme-text-primary theme-border border focus:outline-none w-full"
                                    value={currentPassword}
                                    onChange={e => {
                                        // Solo se muestran los primeros 12 caracteres aunque se escriban más
                                        setCurrentPassword(e.target.value.slice(0, 32));
                                    }}
                                    required
                                    minLength={8}
                                    maxLength={32}
                                />
                                <button
                                    type="button"
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-teal-primary"
                                    onClick={() => setShowCurrentPassword(v => !v)}
                                    tabIndex={-1}
                                    aria-label="Mostrar/Ocultar contraseña actual"
                                >
                                    {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    type={showNewPassword ? "text" : "password"}
                                    placeholder="Nueva contraseña"
                                    className="p-2 pr-10 rounded-lg theme-bg-chat theme-text-primary theme-border border focus:outline-none w-full"
                                    value={newPassword}
                                    onChange={e => {
                                        setNewPassword(e.target.value.slice(0, 32));
                                    }}
                                    required
                                    minLength={8}
                                    maxLength={32}
                                />
                                <button
                                    type="button"
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-teal-primary"
                                    onClick={() => setShowNewPassword(v => !v)}
                                    tabIndex={-1}
                                    aria-label="Mostrar/Ocultar nueva contraseña"
                                >
                                    {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Confirmar nueva contraseña"
                                    className="p-2 pr-10 rounded-lg theme-bg-chat theme-text-primary theme-border border focus:outline-none w-full"
                                    value={confirmPassword}
                                    onChange={e => {
                                        setConfirmPassword(e.target.value.slice(0, 32));
                                    }}
                                    required
                                    minLength={8}
                                    maxLength={32}
                                />
                                <button
                                    type="button"
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-teal-primary"
                                    onClick={() => setShowConfirmPassword(v => !v)}
                                    tabIndex={-1}
                                    aria-label="Mostrar/Ocultar confirmación"
                                >
                                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                            <button
                                type="submit"
                                className="p-2 rounded-lg bg-gradient-to-r from-teal-primary to-teal-secondary text-white font-semibold hover:opacity-90 transition-opacity"
                            >
                                Guardar
                            </button>
                        </form>
                    </div>
                </div>
            )}
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
                @keyframes slideInLeft {
                    from {
                        opacity: 0;
                        transform: translateX(-30px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0) scale(1);
                    }
                }
                @keyframes slideOutRight {
                    from {
                        opacity: 1;
                        transform: translateX(0) scale(1);
                    }
                    to {
                        opacity: 0;
                        transform: translateX(30px) scale(0.95);
                    }
                }
            `}</style>
        </div>
    )
}

export default ProfileModal;