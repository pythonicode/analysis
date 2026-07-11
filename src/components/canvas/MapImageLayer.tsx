import { Image as KonvaImage, Layer } from 'react-konva'
import { useImage } from '../../hooks/useImage'
import { useAppStore } from '../../store'
import MapRotationGroup from './MapRotationGroup'

export default function MapImageLayer() {
  const mapImage = useAppStore((s) => s.mapImage)
  const image = useImage(mapImage?.src ?? null)

  return (
    <Layer listening={false}>
      <MapRotationGroup attachRef>
        {mapImage && image && (
          <KonvaImage
            image={image}
            width={mapImage.width}
            height={mapImage.height}
          />
        )}
      </MapRotationGroup>
    </Layer>
  )
}
