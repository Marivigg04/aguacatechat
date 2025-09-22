import React, { useState } from 'react';
import Lottie from 'react-lottie';
import { FaEye, FaEyeSlash } from 'react-icons/fa'; // Agrega este import al inicio
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
    isEditingInfo,
    setIsEditingInfo,
    profileInfo,
    setProfileInfo,
    newProfileInfo,
    setNewProfileInfo,
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

    React.useEffect(() => {
        async function fetchProfileInfo() {
            if (!user?.id) return;
            try {
                // Import dinámico para evitar problemas de SSR
                const { selectFrom } = await import('./services/db');
                const data = await selectFrom('profiles', {
                    columns: 'profileInformation',
                    match: { id: user.id },
                    single: true
                });
                setProfileInfoDb(data?.profileInformation || '');
            } catch (err) {
                setProfileInfoDb('');
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
                        {/* Foto de perfil centrada */}
                        <div className="flex flex-col items-center mb-4">
                            <div className="w-16 h-16 bg-gradient-to-br from-teal-primary to-teal-secondary rounded-full flex items-center justify-center text-white font-bold text-2xl mb-2">
                                {myProfile.initials}
                            </div>
                            {/* Nombre y edición con transición suave */}
                            <div className="w-full flex flex-col items-center">
                                <div className={`transition-all duration-300 w-full`}>
                                    {!isEditingName ? (
                                        <div className="flex items-center gap-2 justify-center">
                                            <span className="font-semibold theme-text-primary text-lg">{myProfile.name}</span>
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
                        <div className="flex flex-col gap-1 mb-2">
                            <span className="text-sm theme-text-secondary">Número de teléfono:</span>
                            <span className="font-semibold theme-text-primary">{myProfile.phone}</span>
                        </div>
                        {/* Información del perfil editable con transición suave */}
                        <div className="flex flex-col gap-1 mb-2">
                            <span className="text-sm theme-text-secondary">Información del perfil:</span>
                            <div className={`transition-all duration-300 w-full`}>
                                {!isEditingInfo ? (
                                    <div className="flex items-center gap-2 w-full">
                                        <span className="theme-text-primary text-base flex-1 font-semibold">
                                            {profileInfo && profileInfo.trim() !== ''
                                                ? profileInfo
                                                : <span className="theme-text-primary font-semibold">Sin información</span>
                                            }
                                        </span>
                                        <div
                                            className="w-7 h-7"
                                            onClick={() => {
                                                setNewProfileInfo(profileInfo || '');
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
                                        onSubmit={e => {
                                            e.preventDefault();
                                            if (newProfileInfo.trim()) {
                                                setProfileInfo(newProfileInfo.trim());
                                                setIsEditingInfo(false);
                                            }
                                        }}
                                    >
                                        <input
                                            id="profileInfoInput"
                                            type="text"
                                            className="p-1 w-full rounded-lg theme-bg-chat theme-text-primary theme-border border focus:outline-none focus:ring-2 focus:ring-teal-primary font-semibold"
                                            value={newProfileInfo}
                                            onChange={e => setNewProfileInfo(e.target.value)}
                                            onFocus={e => {
                                                if (e.target.value === '' || e.target.value === undefined) {
                                                    setNewProfileInfo('');
                                                }
                                            }}
                                            onBlur={() => {
                                                if (newProfileInfo.trim()) {
                                                    setProfileInfo(newProfileInfo.trim());
                                                }
                                                setIsEditingInfo(false);
                                            }}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    if (newProfileInfo.trim()) {
                                                        setProfileInfo(newProfileInfo.trim());
                                                    }
                                                    setIsEditingInfo(false);
                                                }
                                                if (e.key === 'Escape') {
                                                    setNewProfileInfo(profileInfo);
                                                    setIsEditingInfo(false);
                                                }
                                            }}
                                            autoFocus
                                            placeholder="Agrega tu información de perfil aquí"
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
                                                    setNewProfileInfo(profileInfo);
                                                    setIsEditingInfo(false);
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
                        {/* Opciones de perfil */}
                        <button
                            className="flex items-center gap-2 p-2 rounded transition-colors"
                            onClick={() => alert('Cambiar imagen de perfil')}
                            onMouseEnter={() => {
                                setPhotoProfileStopped(true);
                                setTimeout(() => {
                                    setPhotoProfileStopped(false);
                                    setPhotoProfilePaused(false);
                                }, 10);
                            }}
                            onMouseLeave={() => setPhotoProfilePaused(true)}
                        >
                            <div className="w-7 h-7">
                                <Lottie options={lottieOptions.photoProfile} isPaused={isPhotoProfilePaused} isStopped={isPhotoProfileStopped} />
                            </div>
                            <span className="theme-text-primary">Cambiar imagen de perfil</span>
                        </button>
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