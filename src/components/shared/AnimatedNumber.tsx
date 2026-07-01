import { useEffect, useRef, useState } from 'react'
import { animate } from 'framer-motion'

interface AnimatedNumberProps {
  valor: number
  formatar?: (valor: number) => string
  className?: string
}

export function AnimatedNumber({ valor, formatar, className }: AnimatedNumberProps) {
  const [exibido, setExibido] = useState(valor)
  const anteriorRef = useRef(valor)

  useEffect(() => {
    const controls = animate(anteriorRef.current, valor, {
      duration: 0.4,
      ease: 'easeOut',
      onUpdate: (v) => setExibido(v),
    })
    anteriorRef.current = valor
    return () => controls.stop()
  }, [valor])

  const texto = formatar ? formatar(Math.round(exibido)) : Math.round(exibido).toLocaleString('pt-BR')

  return <span className={className}>{texto}</span>
}
