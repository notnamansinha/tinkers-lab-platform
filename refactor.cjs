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

  // 1. Fix imports from @/services/firebase/firestore
  content = content.replace(
    /import \{([^}]+)\} from ['"]@\/services\/firebase\/firestore['"]/g,
    (match, p1) => {
      let vars = p1.split(',').map(v => v.trim())
      vars = vars.filter(v => !['getDocument', 'addDocument', 'updateDocument', 'deleteDocument', 'getDocumentsWhere'].includes(v))
      if (vars.length === 0) return ''
      return `import { ${vars.join(', ')} } from '@/services/firebase/firestore'`
    }
  )

  // 2. Add imports for firestore
  const hasFirestoreImport = content.includes("'firebase/firestore'") || content.includes('"firebase/firestore"')
  if (!hasFirestoreImport) {
    // Add right after @/services/firebase/firestore if exists
    content = content.replace(
      /(import .*? from ['"]@\/services\/firebase\/firestore['"]\s*?\n)/,
      `$1import { doc, getDoc, collection, addDoc, updateDoc } from 'firebase/firestore'\n`
    )
  } else {
    // Ensure doc, getDoc, collection, addDoc, updateDoc exist
    // simplified for script: just append them if missing
    content = content.replace(
      /(import \{[^}]*)\}(.*from ['"]firebase\/firestore['"])/,
      (match, p1, p2) => {
        let imports = p1.split('{')[1].split(',').map(v => v.trim())
        const needed = ['doc', 'getDoc', 'collection', 'addDoc', 'updateDoc']
        needed.forEach(n => {
          if (!imports.includes(n)) imports.push(n)
        })
        return `import { ${imports.join(', ')} }${p2}`
      }
    )
  }

  // 3. Replace usages

  // getDocument<Type>(COLLECTIONS.ABC, id)
  // queryFn: () => getDocument<Equipment>(COLLECTIONS.EQUIPMENT, id!),
  content = content.replace(
    /queryFn:\s*\(\)\s*=>\s*getDocument<([^>]+)>\(([^,]+),\s*([^)]+)\),/g,
    `queryFn: async () => {\n      const snap = await getDoc(doc(db, $2, $3))\n      if (!snap.exists()) return null\n      return { id: snap.id, ...snap.data() } as $1\n    },`
  )
  content = content.replace(
    /queryFn:\s*async\s*\(\)\s*=>\s*getDocument<([^>]+)>\(([^,]+),\s*([^)]+)\),/g,
    `queryFn: async () => {\n      const snap = await getDoc(doc(db, $2, $3))\n      if (!snap.exists()) return null\n      return { id: snap.id, ...snap.data() } as $1\n    },`
  )

  // getDocumentsWhere
  // queryFn: () => getDocumentsWhere<Booking>(COLLECTIONS.BOOKINGS, 'equipmentId', '==', id!, 50),
  // (Assuming getDocs, query, where, limit are imported, maybe I won't replace this dynamically for all unless needed. Wait, WorkshopDetailPage uses getDocument, not getDocumentsWhere).

  // await addDocument<Type>(COLLECTIONS.ABC, data)
  content = content.replace(
    /await addDocument(?:<[^>]+>)?\(([^,]+),\s*({[\s\S]*?})\)/g,
    `await addDoc(collection(db, $1), $2)`
  )
  content = content.replace(
    /await addDocument(?:<[^>]+>)?\(([^,]+),\s*([^)]+)\)/g,
    (match, col, arg2) => {
       if(arg2.startsWith('{')) return `await addDoc(collection(db, ${col}), ${arg2})`
       return `await addDoc(collection(db, ${col}), ${arg2})`
    }
  )

  // await updateDocument(COLLECTIONS.ABC, id, data)
  content = content.replace(
    /await updateDocument\(([^,]+),\s*([^,]+),\s*({[\s\S]*?})\)/g,
    `await updateDoc(doc(db, $1, $2), $3)`
  )
  content = content.replace(
    /await updateDocument\(([^,]+),\s*([^,]+),\s*([^)]+)\)/g,
    `await updateDoc(doc(db, $1, $2), $3)`
  )


  fs.writeFileSync(filepath, content, 'utf8')
  console.log('Updated ' + file)
})
