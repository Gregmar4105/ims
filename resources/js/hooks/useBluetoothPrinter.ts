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
    const [printerWidth, setPrinterWidth] = useState<number>(384);
    const [mediaType, setMediaType] = useState<'receipt' | 'label'>('receipt');
    const [labelWidth, setLabelWidth] = useState<number>(28);
    const [labelHeight, setLabelHeight] = useState<number>(20);
    const [printerPreset, setPrinterPreset] = useState<'28mm' | '58mm' | '80mm' | 'custom'>('58mm');

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
            const savedWidth = localStorage.getItem('bt_printer_width');
            const savedMediaType = localStorage.getItem('bt_media_type') as 'receipt' | 'label' | null;
            const savedLabelWidth = localStorage.getItem('bt_label_width');
            const savedLabelHeight = localStorage.getItem('bt_label_height');
            const savedPreset = localStorage.getItem('bt_printer_preset') as '28mm' | '58mm' | '80mm' | 'custom' | null;
            
            setSelectedAddress(savedAddress);
            setAutoPrintEnabled(savedAuto);
            setPrinterWidth(savedWidth ? parseInt(savedWidth, 10) : 384);
            setMediaType(savedMediaType || 'receipt');
            setLabelWidth(savedLabelWidth ? parseInt(savedLabelWidth, 10) : 28);
            setLabelHeight(savedLabelHeight ? parseInt(savedLabelHeight, 10) : 20);
            setPrinterPreset(savedPreset || '58mm');

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

    useEffect(() => {
        const handleBluetoothStateChanged = (e: Event) => {
            const customEvent = e as CustomEvent;
            const enabled = customEvent.detail?.enabled;
            setIsBluetoothEnabled(enabled);
            if (enabled) {
                toast.success('Bluetooth turned on!');
                setTimeout(() => {
                    scan();
                }, 500);
            } else {
                setIsConnected(false);
                setPairedDevices([]);
                toast.info('Bluetooth turned off.');
            }
        };
        window.addEventListener('bluetooth-state-changed', handleBluetoothStateChanged);
        return () => {
            window.removeEventListener('bluetooth-state-changed', handleBluetoothStateChanged);
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
            const printSuccess = androidPrint.printBluetoothImage(base64Data, printerWidth, mediaType === 'receipt');
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
            canvas.width = printerWidth;
            canvas.height = 180;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, printerWidth, 180);
                
                ctx.fillStyle = '#000000';
                
                // Draw a beautiful header
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('LM2 BICYCLE TRADING', printerWidth / 2, 40);
                
                ctx.font = '11px Arial';
                ctx.fillText('Bluetooth Print Test', printerWidth / 2, 70);
                
                ctx.font = 'italic 9px Arial';
                ctx.fillText('Width: ' + printerWidth + 'px | ' + (mediaType === 'label' ? 'Label' : 'Receipt'), printerWidth / 2, 100);
                ctx.fillText(new Date().toLocaleDateString(), printerWidth / 2, 120);

                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.setLineDash([2, 2]);
                ctx.moveTo(10, 140);
                ctx.lineTo(printerWidth - 10, 140);
                ctx.stroke();

                ctx.font = 'bold 11px Arial';
                ctx.fillText('Ready for Custom Printing', printerWidth / 2, 160);
            }
            
            const base64Data = canvas.toDataURL('image/png');
            return androidPrint.printBluetoothImage(base64Data, printerWidth, mediaType === 'receipt');
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

    const checkAndSetCustomPreset = (w: number, lw: number, lh: number, mt: 'receipt' | 'label') => {
        if (w === 224 && lw === 28 && lh === 20 && mt === 'label') {
            setPrinterPreset('28mm');
            localStorage.setItem('bt_printer_preset', '28mm');
        } else if (w === 384 && lw === 58 && lh === 0 && mt === 'receipt') {
            setPrinterPreset('58mm');
            localStorage.setItem('bt_printer_preset', '58mm');
        } else if (w === 576 && lw === 80 && lh === 0 && mt === 'receipt') {
            setPrinterPreset('80mm');
            localStorage.setItem('bt_printer_preset', '80mm');
        } else {
            setPrinterPreset('custom');
            localStorage.setItem('bt_printer_preset', 'custom');
        }
    };

    const updatePrinterWidth = (width: number) => {
        setPrinterWidth(width);
        localStorage.setItem('bt_printer_width', String(width));
        checkAndSetCustomPreset(width, labelWidth, labelHeight, mediaType);
        toast.success(`Printer width updated to ${width} dots.`);
    };

    const updateMediaType = (type: 'receipt' | 'label') => {
        setMediaType(type);
        localStorage.setItem('bt_media_type', type);
        const newLh = type === 'receipt' ? 0 : (labelHeight === 0 ? 20 : labelHeight);
        if (type === 'receipt') {
            setLabelHeight(0);
            localStorage.setItem('bt_label_height', '0');
        }
        checkAndSetCustomPreset(printerWidth, labelWidth, newLh, type);
        toast.success(`Media type updated to ${type === 'label' ? 'Label Mode' : 'Receipt Mode'}.`);
    };

    const updateLabelWidth = (width: number) => {
        setLabelWidth(width);
        localStorage.setItem('bt_label_width', String(width));
        checkAndSetCustomPreset(printerWidth, width, labelHeight, mediaType);
        toast.success(`Label physical width updated to ${width}mm.`);
    };

    const updateLabelHeight = (height: number) => {
        setLabelHeight(height);
        localStorage.setItem('bt_label_height', String(height));
        checkAndSetCustomPreset(printerWidth, labelWidth, height, mediaType);
        toast.success(`Label physical height updated to ${height}mm.`);
    };

    const updatePrinterPreset = (preset: '28mm' | '58mm' | '80mm' | 'custom') => {
        setPrinterPreset(preset);
        localStorage.setItem('bt_printer_preset', preset);
        if (preset === '28mm') {
            setPrinterWidth(224);
            localStorage.setItem('bt_printer_width', '224');
            setLabelWidth(28);
            localStorage.setItem('bt_label_width', '28');
            setLabelHeight(20);
            localStorage.setItem('bt_label_height', '20');
            setMediaType('label');
            localStorage.setItem('bt_media_type', 'label');
            toast.success('Switched to 28mm Sticker/Label preset');
        } else if (preset === '58mm') {
            setPrinterWidth(384);
            localStorage.setItem('bt_printer_width', '384');
            setLabelWidth(58);
            localStorage.setItem('bt_label_width', '58');
            setLabelHeight(0);
            localStorage.setItem('bt_label_height', '0');
            setMediaType('receipt');
            localStorage.setItem('bt_media_type', 'receipt');
            toast.success('Switched to 58mm Receipt preset');
        } else if (preset === '80mm') {
            setPrinterWidth(576);
            localStorage.setItem('bt_printer_width', '576');
            setLabelWidth(80);
            localStorage.setItem('bt_label_width', '80');
            setLabelHeight(0);
            localStorage.setItem('bt_label_height', '0');
            setMediaType('receipt');
            localStorage.setItem('bt_media_type', 'receipt');
            toast.success('Switched to 80mm Receipt preset');
        } else if (preset === 'custom') {
            toast.success('Custom sizing unlocked. Feel free to adjust dimensions.');
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
        printerWidth,
        mediaType,
        labelWidth,
        labelHeight,
        printerPreset,
        scan,
        connect,
        disconnect,
        toggleAutoPrint,
        printElement,
        testPrint,
        isBluetoothConnected,
        checkBluetoothEnabled,
        openBluetoothSettings,
        requestBluetoothEnable,
        updatePrinterWidth,
        updateMediaType,
        updateLabelWidth,
        updateLabelHeight,
        updatePrinterPreset
    };
}
