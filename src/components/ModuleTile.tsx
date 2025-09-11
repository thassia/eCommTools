import Link from 'next/link'

type ModuleTileProps = {
  title: string
  description: string
  href: string
}

export function ModuleTile({ title, description, href }: ModuleTileProps) {
  return (
    <Link href={href} style={{ border: "1px solid #eee", borderRadius: 8, padding: 16, textDecoration: "none", color: "#222" }}>
      <h2>{title}</h2>
      <p>{description}</p>
    </Link>
  )
}
