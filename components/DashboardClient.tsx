'use client'

import { useState } from 'react'
import DisplayNameModal from './DisplayNameModal'

interface Props {
  hasDisplayName: boolean
  children: React.ReactNode
}

export default function DashboardClient({ hasDisplayName, children }: Props) {
  const [showModal, setShowModal] = useState(!hasDisplayName)

  return (
    <>
      {showModal && (
        <DisplayNameModal onSaved={() => setShowModal(false)} />
      )}
      {children}
    </>
  )
}
