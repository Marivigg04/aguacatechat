import React, { useEffect, useRef, useState, useCallback } from 'react';

// Componente: Miniatura de video con overlay de botón play verde
// Props:
//  - src: string URL del video
//  - onOpen: () => void  abre el modal
//  - loading (opcional): muestra estado de subida
export const VideoThumbnail = ({ src, onOpen, loading = false }) => {
	return (
			<button
				type="button"
				onClick={onOpen}
				className="group relative block w-64 aspect-square rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-teal-primary transition-shadow shadow-sm hover:shadow-lg"
			title="Reproducir video"
			disabled={loading}
			style={{ background: 'var(--bg-chat,#0f172a)' }}
		>
			{/* Miniatura usando el primer frame vía poster fallback (simple) */}
					<video
						src={src}
						className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none opacity-90 group-hover:opacity-100 transition-opacity"
						preload="metadata"
						muted
					/>
					{/* Espaciador para mantener el cuadrado si el navegador ignora aspect-square (fallback) */}
					<div className="invisible select-none" style={{paddingBottom:'100%'}} />
			{/* Capa oscura suave */}
			<div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />
			{/* Indicador de subida */}
			{loading && (
				<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white text-xs">
					<span className="animate-pulse">Subiendo…</span>
				</div>
			)}
			{/* Botón play */}
			<div className="absolute inset-0 flex items-center justify-center">
				<div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-primary to-teal-secondary shadow-lg flex items-center justify-center transform group-hover:scale-110 transition-transform">
					<svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="currentColor">
						<path d="M8 5v14l11-7z" />
					</svg>
				</div>
			</div>
		</button>
	);
};

// Modal de reproducción de video a pantalla centrada
// Props:
//  - open: boolean
//  - src: string
//  - onClose: () => void
export const VideoModal = ({ open, src, onClose, forceVertical = false }) => {
	const videoRef = useRef(null);
	const containerRef = useRef(null);
	const progressRef = useRef(null);

	const [duration, setDuration] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);
	const [playing, setPlaying] = useState(true);
		const [isFullscreen, setIsFullscreen] = useState(false);
	const [isSeeking, setIsSeeking] = useState(false);
		const [isClosing, setIsClosing] = useState(false);

	// Reset al cerrar
	useEffect(() => {
		if (!open && videoRef.current) {
			videoRef.current.pause();
			videoRef.current.currentTime = 0;
			setPlaying(false);
			setCurrentTime(0);
		}
	}, [open]);

	useEffect(() => {
		const vid = videoRef.current;
		if (!vid) return;
		const handleLoaded = () => setDuration(vid.duration || 0);
		const handleTime = () => setCurrentTime(vid.currentTime);
		const handleEnded = () => setPlaying(false);
		vid.addEventListener('loadedmetadata', handleLoaded);
		vid.addEventListener('timeupdate', handleTime);
		vid.addEventListener('ended', handleEnded);
		return () => {
			vid.removeEventListener('loadedmetadata', handleLoaded);
			vid.removeEventListener('timeupdate', handleTime);
			vid.removeEventListener('ended', handleEnded);
		};
	}, [src]);

	const togglePlay = useCallback(() => {
		const vid = videoRef.current;
		if (!vid) return;
		if (vid.paused) {
			vid.play();
			setPlaying(true);
		} else {
			vid.pause();
			setPlaying(false);
		}
	}, []);

	const handleProgressPointer = useCallback((clientX) => {
		const bar = progressRef.current;
		const vid = videoRef.current;
		if (!bar || !vid || !duration) return;
		const rect = bar.getBoundingClientRect();
		let ratio = (clientX - rect.left) / rect.width;
		ratio = Math.min(1, Math.max(0, ratio));
		const newTime = ratio * duration;
		vid.currentTime = newTime;
		setCurrentTime(newTime);
	}, [duration]);

	const handlePointerDown = (e) => {
		setIsSeeking(true);
		handleProgressPointer(e.clientX);
	};
	const handlePointerMove = (e) => {
		if (isSeeking) handleProgressPointer(e.clientX);
	};
	const handlePointerUp = () => setIsSeeking(false);

	useEffect(() => {
		if (isSeeking) {
			window.addEventListener('pointermove', handlePointerMove);
			window.addEventListener('pointerup', handlePointerUp, { once: true });
		}
		return () => {
			window.removeEventListener('pointermove', handlePointerMove);
		};
	}, [isSeeking]);

	const progressPercent = duration ? (currentTime / duration) * 100 : 0;

	const formatTime = (t) => {
		if (!isFinite(t)) return '0:00';
		const m = Math.floor(t / 60);
		const s = Math.floor(t % 60).toString().padStart(2, '0');
		return `${m}:${s}`;
	};

	const handleKeyDown = (e) => {
		if (e.code === 'Space') {
			e.preventDefault();
			togglePlay();
		} else if (e.code === 'ArrowLeft') {
			videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
		} else if (e.code === 'ArrowRight') {
			videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
		}
	};

	const toggleFullscreen = () => {
		const el = containerRef.current;
		if (!el) return;
		if (!document.fullscreenElement) {
			if (el.requestFullscreen) el.requestFullscreen();
			else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
			setIsFullscreen(true);
		} else {
			if (document.exitFullscreen) document.exitFullscreen();
			else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
			setIsFullscreen(false);
		}
	};

	useEffect(() => {
		const fsChange = () => {
			setIsFullscreen(!!document.fullscreenElement);
		};
		document.addEventListener('fullscreenchange', fsChange);
		return () => document.removeEventListener('fullscreenchange', fsChange);
	}, []);

		// Mostrar mientras open o isClosing sea true
		if (!open && !isClosing) return null;

		const startClose = () => {
			setIsClosing(true);
			setTimeout(() => {
				setIsClosing(false);
				onClose?.();
			}, 400); // duración slideOut similar a ConfigModal
		};

		const handleBackdrop = () => {
			startClose();
		};

	return (
			<div
				className="fixed inset-0 z-50 flex items-center justify-center p-4"
				onClick={handleBackdrop}
				style={{
					animation: isClosing ? 'fadeOut 0.3s ease-in forwards' : 'fadeIn 0.3s ease-out forwards',
					background: 'rgba(0,0,0,0.7)',
					backdropFilter: 'blur(4px)'
				}}
			>
				<div
					ref={containerRef}
					className={`relative max-w-3xl w-full mx-auto rounded-2xl overflow-hidden shadow-2xl bg-black focus:outline-none transition-all duration-700 ${isClosing ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0'}`}
					onClick={(e) => e.stopPropagation()}
					onKeyDown={handleKeyDown}
					tabIndex={0}
					style={{
						animation: isClosing ? 'slideOutRight 0.4s ease-in forwards' : 'slideInLeft 0.4s ease-out forwards'
					}}
				>
					<div className={`${forceVertical ? 'mx-auto w-full flex items-center justify-center bg-black' : ''}`}> 
						<div className={`${forceVertical ? 'relative w-full max-h-[80vh] flex items-center justify-center' : ''}`}> 
							{forceVertical ? (
								<div className="relative w-full max-w-[430px] aspect-[9/16] bg-black flex items-center justify-center px-2 py-2">
									<video
										ref={videoRef}
										className="w-full h-full object-contain select-none"
										src={src}
										autoPlay
										playsInline
										onClick={togglePlay}
									/>
								</div>
							) : (
								<video
									ref={videoRef}
									className="w-full h-full max-h-[80vh] object-contain bg-black select-none"
									src={src}
									autoPlay
									playsInline
									onClick={togglePlay}
								/>
							)}
						</div>
					</div>

				{/* Controles personalizados */}
				<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-4 space-y-2 text-white text-sm">
					{/* Barra de progreso */}
					<div
						ref={progressRef}
						className="group relative w-full h-3 cursor-pointer select-none"
						role="slider"
						aria-valuemin={0}
						aria-valuemax={duration || 0}
						aria-valuenow={currentTime}
						aria-label="Barra de progreso"
									onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e); }}
					>
						<div className="absolute inset-0 rounded-full bg-white/15 backdrop-blur-[2px]" />
						<div
							className="absolute inset-y-0 left-0 rounded-full bg-teal-primary transition-[width] duration-75"
							style={{ width: `${progressPercent}%` }}
						/>
						<div
							className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-teal-primary shadow ring-2 ring-white/70 opacity-0 group-hover:opacity-100 transition-opacity"
							style={{ left: `calc(${progressPercent}% - 8px)` }}
						/>
					</div>
					{/* Controles fila */}
					<div className="flex items-center gap-4">
						<button
							onClick={togglePlay}
							className="w-10 h-10 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-teal-primary"
							aria-label={playing ? 'Pausar' : 'Reproducir'}
						>
							{playing ? (
								<svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
									<path d="M6 5h4v14H6zM14 5h4v14h-4z" />
								</svg>
							) : (
								<svg viewBox="0 0 24 24" className="w-7 h-7 pl-0.5" fill="currentColor">
									<path d="M8 5v14l11-7z" />
								</svg>
							)}
						</button>
						<div className="flex items-center gap-2 text-xs tabular-nums font-medium text-white/90">
							<span>{formatTime(currentTime)}</span>
							<span className="text-white/50">/</span>
							<span>{formatTime(duration)}</span>
						</div>
						<div className="ml-auto flex items-center gap-2">
							<button
								onClick={toggleFullscreen}
								className="w-10 h-10 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 active:scale-95 transition focus:outline-none focus:ring-2 focus:ring-teal-primary"
								aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
							>
								{isFullscreen ? (
									<svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
										<path d="M14 10V4h6v2h-4v4h-2zm-4 0H8V6H4V4h6v6zm4 4h2v4h4v2h-6v-6zm-4 0v6H4v-2h4v-4h2z" />
									</svg>
								) : (
									<svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
										<path d="M8 8H4V4h6v6H8zm12 0h-4V4h6v6h-2zM8 16v2h2v2H4v-6h2v2h2zm10-2h2v6h-6v-2h4v-4z" />
									</svg>
								)}
							</button>
						</div>
					</div>
				</div>

				{/* Botón cerrar */}
						<button
							onClick={startClose}
					className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full bg-black/60 backdrop-blur hover:bg-black/70 text-white transition focus:outline-none focus:ring-2 focus:ring-teal-primary"
					aria-label="Cerrar video"
				>
					<svg viewBox="0 0 24 24" className="w-5 h-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			</div>
					<style jsx>{`
						@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
						@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
						@keyframes slideInLeft {
							from { opacity: 0; transform: translateX(-30px) scale(0.95); }
							to { opacity: 1; transform: translateX(0) scale(1); }
						}
						@keyframes slideOutRight {
							from { opacity: 1; transform: translateX(0) scale(1); }
							to { opacity: 0; transform: translateX(30px) scale(0.95); }
						}
					`}</style>
		</div>
	);
};

export default VideoThumbnail;

