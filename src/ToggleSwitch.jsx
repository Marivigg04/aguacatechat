import React, { useId } from 'react';

// Un componente de interruptor (toggle) moderno y reutilizable.
// Es mucho más profesional que un checkbox estándar.
const ToggleSwitch = ({ isOn, handleToggle, onColor = "bg-emerald-500" }) => {
    const id = useId(); // Hook de React para generar un ID único y estable.

    return (
        <label htmlFor={id} className="flex items-center cursor-pointer">
            <div className="relative">
                <input
                    type="checkbox"
                    id={id} // Usamos el ID estable
                    className="sr-only" // Oculta el checkbox por defecto
                    checked={isOn}
                    onChange={handleToggle}
                />
                <div className={`block w-14 h-8 rounded-full transition-colors ${isOn ? onColor : 'bg-gray-300 dark:bg-gray-600'}`}></div>
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