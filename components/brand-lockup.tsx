import Image from 'next/image'
import styles from './brand-lockup.module.css'

export function BrandLockup() {
  return (
    <span className={styles.lockup}>
      <Image src="/innoflex-mark.svg" alt="" width={36} height={36} />
      <span>
        <span className={styles.name}>
          INNOFLEX <span>SI</span>
        </span>
        <span className={styles.description}>Assistant personnel</span>
      </span>
    </span>
  )
}
