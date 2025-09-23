import React, { useEffect, useMemo, useState } from 'react';

/**
 * MessageRenderer
 * - Muestra el contenido del mensaje en bloques incrementales.
 * - Agrega un botón "Ver más" que revela más texto en cada clic
 *   hasta mostrar el contenido completo.
 */
const MessageRenderer = ({
	text = '',
	chunkSize = 350,
	moreLabel = 'Ver más',
}) => {
	const content = useMemo(() => (typeof text === 'string' ? text : String(text ?? '')), [text]);
	const [visible, setVisible] = useState(chunkSize);

	// Reiniciar visibilidad cuando cambie el contenido o el tamaño del bloque
	useEffect(() => {
		setVisible(chunkSize);
	}, [content, chunkSize]);

	const shown = content.slice(0, Math.min(visible, content.length));
	const hasMore = visible < content.length;

	const handleMore = (e) => {
		e?.preventDefault?.();
		setVisible((v) => Math.min(v + chunkSize, content.length));
	};

	return (
		<span className="whitespace-pre-wrap break-words">
			{shown}
			{hasMore && (
				<>
					{shown.length < content.length ? '… ' : ' '}
					<button
						type="button"
						onClick={handleMore}
						className="text-teal-500 hover:underline font-medium focus:outline-none"
					>
						{moreLabel}
					</button>
				</>
			)}
		</span>
	);
};

export default MessageRenderer;

