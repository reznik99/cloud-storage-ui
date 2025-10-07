import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

interface QRCodeImageProps {
    url: string
    size?: number
}

export function QRCodeImage({ url, size = 256 }: QRCodeImageProps) {
    const [dataUrl, setDataUrl] = useState<string | null>(null)

    useEffect(() => {
        QRCode.toDataURL(url, { width: size })
            .then(setDataUrl)
            .catch((err) => {
                console.error('Failed to generate QR code', err)
                setDataUrl(null)
            })
    }, [url, size])

    if (!dataUrl) return <div>Loading QR code...</div>

    return <img src={dataUrl} alt="QR code" width={size} height={size} />
}
