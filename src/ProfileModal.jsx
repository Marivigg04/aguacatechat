import React, { useState } from 'react';
import Lottie from 'react-lottie';
import { FaEye, FaEyeSlash, FaPen } from 'react-icons/fa'; // Agrega este import al inicio
import { supabase } from './services/supabaseClient';
import { useAuth } from './context/AuthContext.jsx'
import { useNavigate } from 'react-router-dom'

const ProfileModal = ({
    showProfileModal,
    setShowProfileModal,
    myProfile,
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
    // (independiente de los props, para evitar problemas de sincronización)
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

    // Estado para la info de perfil desde Supabase
    const [profileInfoDb, setProfileInfoDb] = useState('');
    // Estado y ref para la foto de perfil local (vista previa), url remota y selector de archivos
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const fileInputRef = React.useRef(null);

    // Helpers: validación, recorte y utilidades de imagen
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    // Soporte de tipos comunes en navegadores (bucket público)
    const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const TARGET_SIZE = 512; // tamaño final cuadrado

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
        // Devuelve { blob, mime, ext, previewUrl }
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

    React.useEffect(() => {
        async function fetchProfileInfo() {
            if (!user?.id) return;
            try {
                // Import dinámico para evitar problemas de SSR
                const { selectFrom } = await import('./services/db');
                const data = await selectFrom('profiles', {
                    columns: 'profileInformation, avatar_url',
                    match: { id: user.id },
                    single: true
                });
                setProfileInfoDb(data?.profileInformation || '');
                setAvatarUrl(data?.avatar_url || null);
            } catch (err) {
                setProfileInfoDb('');
                setAvatarUrl(null);
            }
        }
        fetchProfileInfo();
    }, [user?.id, showProfileModal]);

    return (
        showProfileModal && (
            <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 transition-opacity duration-300">
                <div
                    className="theme-bg-secondary rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="p-6 theme-border border-b flex items-center justify-between">
                        <h3 className="text-xl font-bold theme-text-primary">Perfil</h3>
                        <button onClick={() => setShowProfileModal(false)} className="p-2 rounded-full hover:theme-bg-chat transition-colors">
                            ✕
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

                                    // Validaciones
                                    const errorMsg = validateFile(file);
                                    if (errorMsg) {
                                        if (window.toast) window.toast.error(errorMsg);
                                        else {
                                            try { const { default: toast } = await import('react-hot-toast'); toast.error(errorMsg); } catch {}
                                        }
                                        return;
                                    }

                                    // Recorte/resize previo y vista previa del procesado
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
                                        // Construir ruta de almacenamiento
                                        const oldPath = extractPathFromPublicUrl(avatarUrl);
                                        const fileName = `${Date.now()}.${ext}`;
                                        const path = `${user.id}/${fileName}`;
                                        if (import.meta.env?.DEV) {
                                            console.debug('[Avatar] Subiendo a', { bucket: 'userphotos', path, mime });
                                        }
                                        // Subir al bucket userphotos
                                        const { error: uploadError } = await supabase.storage
                                            .from('userphotos')
                                            // Bucket público: añadimos cacheControl para aprovechar CDN. Como usamos nombres únicos por timestamp,
                                            // no tendremos problemas de caché al actualizar.
                                            .upload(path, blob, { upsert: true, contentType: mime, cacheControl: '31536000' });
                                        if (uploadError) {
                                            if (import.meta.env?.DEV) {
                                                console.error('[Avatar] Error en upload:', uploadError);
                                            }
                                            throw uploadError;
                                        }

                                        // Obtener URL pública
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

                                        // Guardar en profiles.avatar_url
                                        const { updateTable } = await import('./services/db');
                                        await updateTable('profiles', { id: user.id }, { avatar_url: publicUrl });

                                        // Actualizar UI a la URL pública y liberar el objeto local
                                        if (previewUrl) URL.revokeObjectURL(previewUrl);
                                        setAvatarPreview(null);
                                        setAvatarUrl(publicUrl);
                                        // Notificar a otros componentes (e.g., Sidebar) que el avatar cambió
                                        try {
                                            window.dispatchEvent(new CustomEvent('profile:avatar-updated', { detail: publicUrl }));
                                        } catch {}

                                        // Eliminar avatar anterior si existía
                                        if (oldPath) {
                                            try {
                                                await supabase.storage.from('userphotos').remove([oldPath]);
                                            } catch (delErr) {
                                                console.warn('No se pudo eliminar la imagen anterior:', delErr);
                                            }
                                        }

                                        // Notificación opcional
                                        if (window.toast) window.toast.success('Foto actualizada');
                                        else {
                                            try {
                                                const { default: toast } = await import('react-hot-toast');
                                                toast.success('Foto actualizada');
                                            } catch {}
                                        }

                                        // Callback opcional para capas superiores
                                        if (typeof myProfile?.onPhotoSelected === 'function') {
                                            try { myProfile.onPhotoSelected(file, publicUrl); } catch {}
                                        }
                                    } catch (err) {
                                        // Si falla, mantener (o limpiar) la vista previa local y avisar
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
                            {/* Nombre y edición con transición suave */}
                            <div className="w-full flex flex-col items-center mt-5">
                                <div className={`transition-all duration-300 w-full`}>
                                    {!isEditingName ? (
                                        <div className="flex items-center gap-4 justify-center">
                                            <span className="font-semibold theme-text-primary text-3xl">{myProfile.name}</span>
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
                                        </div>
                                    ) : (
                                        <form
                                            className="flex flex-col items-center gap-2 w-full"
                                            onSubmit={e => {
                                                e.preventDefault();
                                                if (newProfileName.trim()) {
                                                    myProfile.name = newProfileName.trim();
                                                    setIsEditingName(false);
                                                }
                                            }}
                                        >
                                            <input
                                                id="profileNameInput"
                                                type="text"
                                                className="p-1 w-full rounded-lg theme-bg-chat theme-text-primary theme-border border focus:outline-none focus:ring-2 focus:ring-teal-primary"
                                                value={newProfileName}
                                                onChange={e => setNewProfileName(e.target.value)}
                                                onBlur={() => {
                                                    if (newProfileName.trim()) {
                                                        myProfile.name = newProfileName.trim();
                                                    }
                                                    setIsEditingName(false);
                                                }}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        if (newProfileName.trim()) {
                                                            myProfile.name = newProfileName.trim();
                                                        }
                                                        setIsEditingName(false);
                                                    }
                                                    if (e.key === 'Escape') {
                                                        setNewProfileName(myProfile.name);
                                                        setIsEditingName(false);
                                                    }
                                                }}
                                                autoFocus
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
                                                        setNewProfileName(myProfile.name);
                                                        setIsEditingName(false);
                                                    }}
                                                    title="Cancelar"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* Se eliminó el número de teléfono */}
                        {/* Información del perfil editable con transición suave */}
                        <div className="flex flex-col gap-1 mb-2">
                            <span className="text-sm theme-text-secondary">Información del perfil:</span>
                            <div className={`transition-all duration-300 w-full`}>
                                {!isEditingInfo ? (
                                    <div className="flex items-center gap-2 w-full">
                                        <span className="theme-text-primary text-base flex-1">{profileInfoDb || 'Sin información disponible.'}</span>
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
                                    </div>
                                ) : (
                                    <form
                                        className="flex flex-col items-center gap-2 w-full"
                                        onSubmit={async e => {
                                            e.preventDefault();
                                            if (newProfileInfo.trim()) {
                                                try {
                                                    const { updateTable } = await import('./services/db');
                                                    await updateTable('profiles', { id: user.id }, { profileInformation: newProfileInfo.trim() });
                                                    setProfileInfoDb(newProfileInfo.trim());
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
                                        <input
                                            id="profileInfoInput"
                                            type="text"
                                            className="p-1 w-full rounded-lg theme-bg-chat theme-text-primary theme-border border focus:outline-none focus:ring-2 focus:ring-teal-primary"
                                            value={newProfileInfo}
                                            onChange={e => setNewProfileInfo(e.target.value)}
                                            autoFocus
                                        />
                                        <div className="flex gap-2 mt-1">
                                            <button
                                                type="submit"
                                                className="p-1 rounded-lg bg-gradient-to-r from-teal-primary to-teal-secondary text-white font-semibold hover:opacity-90 transition-opacity"
                                                title="Guardar"
                                            >Guardar</button>
                                            <button
                                                type="button"
                                                className="p-1 rounded-lg theme-bg-chat theme-text-primary theme-border border"
                                                onClick={() => {
                                                    setIsEditingInfo(false);
                                                }}
                                                title="Cancelar"
                                            >Cancelar</button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                        {/* Se eliminó el botón "Cambiar imagen de perfil" */}
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
                        {/* Botón Cerrar sesión reducido y centrado */}
                        <div className="flex justify-center mt-2">
                            <button
                                className="flex items-center gap-2 px-3 py-1 rounded transition-colors bg-gradient-to-r from-teal-primary to-teal-secondary text-white font-semibold hover:opacity-90"
                                style={{ fontSize: '0.95rem', minWidth: '120px' }}
                                onClick={async () => {
                                    await signOut();
                                    setShowProfileModal(false);
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
                    </div>
                </div>
                {/* Ventana emergente para cambiar contraseña */}
                {showEditPasswordModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                        <div className="theme-bg-secondary rounded-2xl w-full max-w-xs flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="p-4 theme-border border-b flex items-center justify-between">
                                <h3 className="text-lg font-bold theme-text-primary">Cambiar contraseña</h3>
                                <button onClick={() => setShowEditPasswordModal(false)} className="p-2 rounded-lg theme-bg-chat hover:opacity-80 transition-opacity">
                                    ✕
                                </button>
                            </div>
                            <form
                                className="flex flex-col gap-3 p-4"
                                onSubmit={e => {
                                    e.preventDefault();
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
                                        onChange={e => setCurrentPassword(e.target.value)}
                                        required
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
                                        onChange={e => setNewPassword(e.target.value)}
                                        required
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
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        required
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
            </div>
        )
    );
};

export default ProfileModal;