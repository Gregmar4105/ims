import { useState, useEffect } from 'react';
import { toCanvas } from 'html-to-image';
import { toast } from 'sonner';

interface BluetoothDevice {
    name: string;
    address: string;
}

export function useBluetoothPrinter() {
    const [isSupported, setIsSupported] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [pairedDevices, setPairedDevices] = useState<BluetoothDevice[]>([]);
    const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
    const [autoPrintEnabled, setAutoPrintEnabled] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isBluetoothEnabled, setIsBluetoothEnabled] = useState(true);

    const androidPrint = typeof window !== 'undefined' ? (window as any).AndroidPrint : null;

    useEffect(() => {
        if (androidPrint) {
            setIsSupported(true);
            const connected = androidPrint.isBluetoothConnected();
            setIsConnected(connected);

            // Check if bluetooth is enabled
            if (typeof androidPrint.isBluetoothEnabled === 'function') {
                setIsBluetoothEnabled(androidPrint.isBluetoothEnabled());
            }

            // Load saved preferences
            const savedAddress = localStorage.getItem('bt_printer_address');
            const savedAuto = localStorage.getItem('bt_auto_print') === 'true';
            
            setSelectedAddress(savedAddress);
            setAutoPrintEnabled(savedAuto);

            if (savedAddress) {
                // Try to scan first to retrieve paired list, then check if we should auto-connect
                try {
                    const devicesRaw = androidPrint.getPairedDevices();
                    const devices: BluetoothDevice[] = JSON.parse(devicesRaw || '[]');
                    setPairedDevices(devices);

                    const found = devices.some(d => d.address === savedAddress);
                    if (found && !connected) {
                        // Silent auto-connect attempt
                        setIsConnecting(true);
                        setTimeout(() => {
                            try {
                                const ok = androidPrint.connectToDevice(savedAddress);
                                setIsConnected(ok);
                            } catch (e) {
                                console.error('Auto-connect failed', e);
                            } finally {
                                setIsConnecting(false);
                            }
                        }, 500);
                    }
                } catch (err) {
                    console.error('Error fetching paired devices on init', err);
                }
            }
        }
    }, [androidPrint]);

    useEffect(() => {
        const handlePermissionsGranted = () => {
            toast.success('Bluetooth permissions granted!');
            setTimeout(() => {
                scan();
            }, 300);
        };
        window.addEventListener('bluetooth-permissions-granted', handlePermissionsGranted);
        return () => {
            window.removeEventListener('bluetooth-permissions-granted', handlePermissionsGranted);
        };
    }, [androidPrint]);

    const scan = () => {
        if (!androidPrint) return;
        setIsScanning(true);
        try {
            const devicesRaw = androidPrint.getPairedDevices();
            const devices: BluetoothDevice[] = JSON.parse(devicesRaw || '[]');
            setPairedDevices(devices);
            
            // Trigger android permission prompt implicitly if empty
            if (devices.length === 0) {
                androidPrint.checkBluetoothPermissions();
            }
        } catch (e) {
            console.error('Failed to get paired devices', e);
            toast.error('Failed to scan for paired Bluetooth devices');
        } finally {
            setIsScanning(false);
        }
    };

    const connect = (address: string): boolean => {
        if (!androidPrint) return false;
        setIsConnecting(true);
        try {
            const success = androidPrint.connectToDevice(address);
            if (success) {
                setIsConnected(true);
                setSelectedAddress(address);
                localStorage.setItem('bt_printer_address', address);
                toast.success('Connected to Bluetooth printer successfully!');
                return true;
            } else {
                toast.error('Failed to connect to printer. Ensure it is turned on and paired.');
                return false;
            }
        } catch (e) {
            console.error('Connection error', e);
            toast.error('Connection error occurred');
            return false;
        } finally {
            setIsConnecting(false);
        }
    };

    const disconnect = () => {
        if (!androidPrint) return;
        try {
            androidPrint.disconnect();
            setIsConnected(false);
            toast.info('Disconnected from printer.');
        } catch (e) {
            console.error('Disconnection error', e);
        }
    };

    const toggleAutoPrint = (enabled: boolean) => {
        setAutoPrintEnabled(enabled);
        localStorage.setItem('bt_auto_print', String(enabled));
        toast.success(enabled ? 'Bluetooth Auto-Print Enabled' : 'Bluetooth Auto-Print Disabled');
    };

    const printElement = async (elementId: string): Promise<boolean> => {
        if (!androidPrint) return false;
        
        // Double check socket state
        const connected = androidPrint.isBluetoothConnected();
        setIsConnected(connected);

        if (!connected) {
            if (selectedAddress) {
                // Try quick reconnect
                const reconnected = connect(selectedAddress);
                if (!reconnected) return false;
            } else {
                toast.error('No Bluetooth printer connected. Please connect one first.');
                return false;
            }
        }

        const el = document.getElementById(elementId);
        if (!el) {
            toast.error('Receipt content not found.');
            return false;
        }

        try {
            // Render DOM to high-quality Canvas for thermal raster rendering
            // We set standard parameters for standard high-contrast thermal results
            const canvas = await toCanvas(el, {
                pixelRatio: 2.5, // 2.5x density works extremely well for high-contrast text and barcode scanning
                backgroundColor: '#ffffff',
                style: {
                    transform: 'scale(1)',
                    transformOrigin: 'top left'
                }
            });

            // Convert to base64 image data URL
            const base64Data = canvas.toDataURL('image/png');

            // Send base64 to native printer spooler
            const printSuccess = androidPrint.printBluetoothImage(base64Data);
            if (printSuccess) {
                toast.success('Sent print job to Bluetooth printer.');
                return true;
            } else {
                toast.error('Failed to print to Bluetooth printer.');
                return false;
            }
        } catch (e) {
            console.error('Error generating image for printing', e);
            toast.error('Error occurred preparing document for printing');
            return false;
        }
    };

    const testPrint = async (): Promise<boolean> => {
        if (!androidPrint || !isBluetoothConnected()) {
            toast.error('Not connected to a printer.');
            return false;
        }
        
        try {
            // We can send a beautifully formatted canvas image as a test page!
            const canvas = document.createElement('canvas');
            canvas.width = 384;
            canvas.height = 200;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, 384, 200);
                
                ctx.fillStyle = '#000000';
                
                // Draw a beautiful header
                ctx.font = 'bold 20px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('LM2 BICYCLE TRADING', 192, 40);
                
                ctx.font = '14px Arial';
                ctx.fillText('Bluetooth Print Test', 192, 70);
                
                ctx.font = 'italic 11px Arial';
                ctx.fillText('Connection Success!', 192, 100);
                ctx.fillText(new Date().toLocaleString(), 192, 120);

                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.setLineDash([4, 4]);
                ctx.moveTo(10, 140);
                ctx.lineTo(374, 140);
                ctx.stroke();

                ctx.font = 'bold 12px Arial';
                ctx.fillText('Ready for Sales Receipts', 192, 170);
            }
            
            const base64Data = canvas.toDataURL('image/png');
            return androidPrint.printBluetoothImage(base64Data);
        } catch (err) {
            console.error('Test print failed', err);
            toast.error('Test print failed.');
            return false;
        }
    };

    const isBluetoothConnected = () => {
        if (!androidPrint) return false;
        try {
            return androidPrint.isBluetoothConnected();
        } catch (e) {
            return false;
        }
    };

    const checkBluetoothEnabled = (): boolean => {
        if (!androidPrint) return false;
        try {
            if (typeof androidPrint.isBluetoothEnabled === 'function') {
                const enabled = androidPrint.isBluetoothEnabled();
                setIsBluetoothEnabled(enabled);
                return enabled;
            }
        } catch (e) {
            console.error('Error checking bluetooth enabled state', e);
        }
        return true;
    };

    const openBluetoothSettings = () => {
        if (!androidPrint) return;
        try {
            if (typeof androidPrint.openBluetoothSettings === 'function') {
                androidPrint.openBluetoothSettings();
            }
        } catch (e) {
            console.error('Error opening bluetooth settings', e);
        }
    };

    const requestBluetoothEnable = () => {
        if (!androidPrint) return;
        try {
            if (typeof androidPrint.requestBluetoothEnable === 'function') {
                androidPrint.requestBluetoothEnable();
            }
        } catch (e) {
            console.error('Error requesting bluetooth enable', e);
        }
    };

    return {
        isSupported,
        isConnected,
        pairedDevices,
        selectedAddress,
        autoPrintEnabled,
        isScanning,
        isConnecting,
        isBluetoothEnabled,
        scan,
        connect,
        disconnect,
        toggleAutoPrint,
        printElement,
        testPrint,
        isBluetoothConnected,
        checkBluetoothEnabled,
        openBluetoothSettings,
        requestBluetoothEnable
    };
}
