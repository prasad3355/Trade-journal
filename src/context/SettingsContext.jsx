import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DEFAULT_SETTINGS, SETTINGS_VERSION } from '../config/settings';

const STORAGE_KEY = "tradefolio_settings";

const SettingsContext = createContext();

const mergeConfig = (base, partial) => {
    if (!partial || typeof partial !== 'object') return base;
    const result = { ...base };
    for (const key of Object.keys(base)) {
        if (partial[key] !== undefined) {
            if (typeof base[key] === 'object' && !Array.isArray(base[key])) {
                // Deep merge 2nd level object
                result[key] = { ...base[key] };
                for (const subKey of Object.keys(base[key])) {
                    if (partial[key][subKey] !== undefined) {
                        if (Array.isArray(base[key][subKey])) {
                            result[key][subKey] = Array.isArray(partial[key][subKey]) ? partial[key][subKey] : base[key][subKey];
                        } else {
                            result[key][subKey] = partial[key][subKey];
                        }
                    }
                }
            } else if (Array.isArray(base[key])) {
                result[key] = Array.isArray(partial[key]) ? partial[key] : base[key];
            } else {
                result[key] = partial[key];
            }
        }
    }
    return result;
};

export const SettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.version === SETTINGS_VERSION) {
                    setSettings(mergeConfig(DEFAULT_SETTINGS, parsed.data));
                } else {
                    setSettings(mergeConfig(DEFAULT_SETTINGS, parsed.data || parsed));
                }
            }
        } catch (e) {
            console.warn("Malformed settings in local storage. Falling back to defaults.", e);
            setSettings(DEFAULT_SETTINGS);
        } finally {
            setIsLoaded(true);
        }
    }, []);

    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                version: SETTINGS_VERSION,
                data: settings
            }));
        }
    }, [settings, isLoaded]);

    const updateSettings = useCallback((partialUpdates) => {
        setSettings(prev => mergeConfig(prev, partialUpdates));
    }, []);

    const resetSettings = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setSettings(DEFAULT_SETTINGS);
    }, []);

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => useContext(SettingsContext);
