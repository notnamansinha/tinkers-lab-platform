const fs = require('fs')
const path = require('path')

const filesToUpdate = [
  'src/features/bookings/BookingDetailPage.tsx',
  'src/features/inventory/InventoryDetailPage.tsx',
  'src/features/inventory/InventoryFormPage.tsx',
  'src/features/issues/IssueFormPage.tsx',
  'src/features/maintenance/MaintenanceDetailPage.tsx',
  'src/features/maintenance/MaintenanceFormPage.tsx',
  'src/features/projects/ProjectDetailPage.tsx',
  'src/features/projects/ProjectFormPage.tsx',
  'src/features/workshops/WorkshopDetailPage.tsx',
  'src/features/workshops/WorkshopFormPage.tsx',
  'src/features/workshops/WorkshopListPage.tsx'
]

filesToUpdate.forEach(file => {
  const filepath = path.join(__dirname, file)
  if (!fs.existsSync(filepath)) return
  let content = fs.readFileSync(filepath, 'utf8')

  // add db import if missing
  if (!content.includes("import { db }") && !content.includes("import {db}")) {
    content = content.replace(
      /(import .*? from 'firebase\/firestore'\s*\n)/,
      `$1import { db } from '@/lib/firebase'\n`
    )
  }

  // fix getDocumentsWhere in InventoryDetailPage
  if (file.includes('InventoryDetailPage.tsx')) {
    content = content.replace(
      /queryFn:\s*\(\)\s*=>\s*getDocumentsWhere<ToolCheckout>\(COLLECTIONS\.TOOL_CHECKOUTS,\s*'toolId',\s*'==',\s*id!,\s*10\)/,
      `queryFn: async () => {\n      const q = query(collection(db, COLLECTIONS.TOOL_CHECKOUTS), where('toolId', '==', id!), limit(10))\n      const snap = await getDocs(q)\n      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as ToolCheckout)\n    }`
    )
    content = content.replace(
      /queryFn:\s*async\s*\(\)\s*=>\s*getDocumentsWhere<ToolCheckout>\(COLLECTIONS\.TOOL_CHECKOUTS,\s*'toolId',\s*'==',\s*id!,\s*10\)/,
      `queryFn: async () => {\n      const q = query(collection(db, COLLECTIONS.TOOL_CHECKOUTS), where('toolId', '==', id!), limit(10))\n      const snap = await getDocs(q)\n      return snap.docs.map(d => ({ id: d.id, ...d.data() }) as ToolCheckout)\n    }`
    )
    content = content.replace(/\(t\) => t\.returnedAt/, '(t: any) => t.returnedAt')

    // ensure getDocs, limit, query, where are imported
    if (!content.includes('getDocs')) {
      content = content.replace(/getDoc,\s*/, 'getDoc, getDocs, limit, query, where, ')
    }
  }

  fs.writeFileSync(filepath, content, 'utf8')
  console.log('Fixed ' + file)
})
