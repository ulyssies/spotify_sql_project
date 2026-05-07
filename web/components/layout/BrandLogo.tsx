import Link from 'next/link'

type BrandLogoProps = {
  className?: string
  showWordmark?: boolean
  href?: string
}

export function BrandLogo({ className = '', showWordmark = true, href }: BrandLogoProps) {
  const src = showWordmark
    ? '/brand/spotyourvibe-logo.png'
    : '/brand/spotyourvibe-mark.png'

  const content = (
    <span className={['inline-flex items-center', className].join(' ')}>
      <img
        src={src}
        alt="SpotYourVibe"
        className={
          showWordmark
            ? 'h-[2.45rem] w-auto object-contain sm:h-[3.2rem]'
            : 'h-8 w-8 rounded-full object-cover sm:h-9 sm:w-9'
        }
      />
    </span>
  )

  if (!href) return content

  return (
    <Link href={href} aria-label="SpotYourVibe home" className="inline-flex">
      {content}
    </Link>
  )
}
