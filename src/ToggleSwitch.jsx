import React, { useId } from 'react';

// Un componente de interruptor (toggle) moderno y reutilizable.
// Es mucho más profesional que un checkbox estándar.
const ToggleSwitch = ({ isOn, handleToggle, onColor = "bg-emerald-500", disabled = false }) => {
    const id = useId(); // Hook de React para generar un ID único y estable.

    const baseWrapper = "flex items-center";
    const cursorCls = disabled ? "cursor-not-allowed" : "cursor-pointer";
    const opacityCls = disabled ? "opacity-40" : "opacity-100";
    return (
        <label
            htmlFor={id}
            className={`${baseWrapper} ${cursorCls} ${opacityCls}`}
            onClick={(e) => { if (disabled) { e.preventDefault(); e.stopPropagation(); } }}
        >
            <div className="relative">
                <input
                    type="checkbox"
                    id={id} // Usamos el ID estable
                    className="sr-only" // Oculta el checkbox por defecto
                    checked={isOn}
                    onChange={(e) => { if (disabled) { e.preventDefault(); return; } handleToggle(e); }}
                    disabled={disabled}
                />
                <div className={`block w-14 h-8 rounded-full transition-colors ${isOn ? onColor : 'bg-gray-300 dark:bg-gray-600'} ${disabled ? 'opacity-70' : ''}`}></div>
                <div
                    className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 ease-in-out ${
                        isOn ? 'transform translate-x-6' : ''
                    }`}
                ></div>
            </div>
        </label>
    );
};

export default ToggleSwitch;