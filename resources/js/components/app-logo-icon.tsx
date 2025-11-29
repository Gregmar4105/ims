import { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
    const imagePath = '/LM2-no-bg.png'; 
    return (
        <img
            {...props} 
            src={imagePath}
            alt="Application Logo"
            // Use Tailwind classes to set a larger default size. 
            // h-10 and w-10 (40px x 40px) is a common medium size. 
            // Let's use h-16 w-16 (64px x 64px) for a noticeably bigger logo.
            className={` ${props.className || ''}`} 
        />
    );
}
