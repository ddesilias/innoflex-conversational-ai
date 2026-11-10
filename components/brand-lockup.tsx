import Image from 'next/image'
import { APP_DESCRIPTOR } from '@/lib/brand'
import styles from './brand-lockup.module.css'

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`${styles.lockup} ${compact ? styles.compact : ''}`}>
      <Image src="/innoflex-mark.svg" alt="" width={36} height={36} />
      <span>
        <span className={styles.name}>INNOFLEX</span>
        <span className={styles.description}>{APP_DESCRIPTOR}</span>
      </span>
    </span>
  )
}
