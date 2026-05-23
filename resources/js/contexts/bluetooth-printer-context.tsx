import React, { createContext, useContext, type ReactNode } from 'react';
import { useBluetoothPrinter, type BluetoothPrinterState } from '@/hooks/useBluetoothPrinter';

const BluetoothPrinterContext = createContext<BluetoothPrinterState | null>(null);

/**
 * Singleton provider for the Bluetooth printer state.
 * Wrap your app (or layout) with this provider ONCE so that all consumers
 * share the same connection state, event listeners, and toast notifications.
 *
 * This prevents the "triple toast" bug caused by multiple useBluetoothPrinter()
 * instances each registering their own window event listeners.
 */
export function BluetoothPrinterProvider({ children }: { children: ReactNode }) {
    const bt = useBluetoothPrinter();

    return (
        <BluetoothPrinterContext.Provider value={bt}>
            {children}
        </BluetoothPrinterContext.Provider>
    );
}

/**
 * Hook to consume the shared Bluetooth printer state from the context.
 * Must be used inside a <BluetoothPrinterProvider>.
 *
 * Returns a "safe" fallback object if called outside the provider
 * (e.g. pages not wrapped in AppLayout like standalone print pages),
 * so it never throws — just reports isSupported=false.
 */
export function useBluetoothPrinterContext(): BluetoothPrinterState {
    const ctx = useContext(BluetoothPrinterContext);

    // If we're outside the provider (e.g. a standalone print page that doesn't
    // use AppLayout), return a safe no-op object instead of throwing.
    if (!ctx) {
        return {
            isSupported: false,
            isConnected: false,
            pairedDevices: [],
            selectedAddress: null,
            connectingAddress: null,
            autoPrintEnabled: false,
            isScanning: false,
            isConnecting: false,
            isBluetoothEnabled: true,
            printerWidth: 384,
            mediaType: 'receipt',
            labelWidth: 58,
            labelHeight: 0,
            printerPreset: '58mm',
            scan: () => {},
            connect: () => false,
            disconnect: () => {},
            toggleAutoPrint: () => {},
            printElement: async () => false,
            testPrint: async () => false,
            isBluetoothConnected: () => false,
            checkBluetoothEnabled: () => false,
            openBluetoothSettings: () => {},
            requestBluetoothEnable: () => {},
            updatePrinterWidth: () => {},
            updateMediaType: () => {},
            updateLabelWidth: () => {},
            updateLabelHeight: () => {},
            updatePrinterPreset: () => {},
        };
    }

    return ctx;
}
