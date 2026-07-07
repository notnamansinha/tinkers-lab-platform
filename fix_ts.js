const fs = require('fs');

const files = [
  'src/features/equipment/EquipmentListPage.tsx',
  'src/features/inventory/InventoryListPage.tsx',
  'src/features/maintenance/MaintenanceListPage.tsx',
  'src/features/projects/ProjectListPage.tsx',
  'src/features/workshops/WorkshopListPage.tsx',
  'src/features/dashboard/DashboardPage.tsx',
  'src/features/bookings/BookingCalendarPage.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf-8');
  
  // Select onValueChange fixes
  content = content.replace(/onValueChange=\{set([A-Za-z0-9_]+)\}/g, 'onValueChange={(val) => set$1(val || "")}');
  
  // DashboardPage Button asChild fixes
  content = content.replace(/<Button variant="ghost" size="sm" asChild className="hidden sm:flex">\s*<Link to="\/bookings">View all <ChevronRight className="ml-1 h-4 w-4" \/><\/Link>\s*<\/Button>/g, 
  `<Button variant="ghost" size="sm" className="hidden sm:flex" onClick={() => navigate('/bookings')}>View all <ChevronRight className="ml-1 h-4 w-4" /></Button>`);

  content = content.replace(/<Button variant="ghost" size="sm" asChild className="text-orange-700 dark:text-orange-500">\s*<Link to="\/inventory">Manage<\/Link>\s*<\/Button>/g,
  `<Button variant="ghost" size="sm" className="text-orange-700 dark:text-orange-500" onClick={() => navigate('/inventory')}>Manage</Button>`);
  
  // BookingCalendarPage Button asChild fixes
  content = content.replace(/<Button asChild className="shrink-0 gap-2">\s*<Link to="\/bookings\/new">\s*<Plus className="h-4 w-4" \/> New Booking\s*<\/Link>\s*<\/Button>/g,
  `<Button className="shrink-0 gap-2" onClick={() => navigate('/bookings/new')}><Plus className="h-4 w-4" /> New Booking</Button>`);
  
  content = content.replace(/<Button variant="ghost" size="sm" asChild>\s*<Link to=\{`\/bookings\/\$\{b\.id\}`\}>View<\/Link>\s*<\/Button>/g,
  `<Button variant="ghost" size="sm" onClick={() => navigate(\`/bookings/\${b.id}\`)}>View</Button>`);
  
  content = content.replace(/<Button variant="link" asChild>\s*<Link to="\/bookings\/new">Make your first booking<\/Link>\s*<\/Button>/g,
  `<Button variant="link" onClick={() => navigate('/bookings/new')}>Make your first booking</Button>`);

  // EquipmentListPage Button asChild fixes
  content = content.replace(/<Button asChild className="shrink-0 gap-2">\s*<Link to="\/equipment\/new"><Plus className="h-4 w-4" \/> Add Equipment<\/Link>\s*<\/Button>/g, 
  `<Button className="shrink-0 gap-2" onClick={() => navigate('/equipment/new')}><Plus className="h-4 w-4" /> Add Equipment</Button>`);
  
  content = content.replace(/<Button variant="ghost" size="sm" asChild onClick=\{\(ev\) => ev\.stopPropagation\(\)\}>\s*<Link to=\{`\/bookings\/new\?machine=\$\{e\.id\}`\}>Book &rarr;<\/Link>\s*<\/Button>/g,
  `<Button variant="ghost" size="sm" onClick={(ev) => { ev.stopPropagation(); navigate(\`/bookings/new?machine=\${e.id}\`); }}>Book &rarr;</Button>`);
  
  content = content.replace(/<Button variant="ghost" size="sm" asChild className="opacity-0 group-hover:opacity-100 transition-opacity" onClick=\{ev => ev\.stopPropagation\(\)\}>\s*<Link to=\{`\/bookings\/new\?machine=\$\{e\.id\}`\}>Book<\/Link>\s*<\/Button>/g,
  `<Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={ev => { ev.stopPropagation(); navigate(\`/bookings/new?machine=\${e.id}\`); }}>Book</Button>`);

  // InventoryListPage Button asChild fixes
  content = content.replace(/<Button variant="outline" asChild className="hidden sm:flex">\s*<Link to="\/checkout\/new"><Package className="h-4 w-4 mr-2" \/> Tool Checkout<\/Link>\s*<\/Button>/g,
  `<Button variant="outline" className="hidden sm:flex" onClick={() => navigate('/checkout/new')}><Package className="h-4 w-4 mr-2" /> Tool Checkout</Button>`);

  content = content.replace(/<Button asChild className="shrink-0 gap-2">\s*<Link to="\/inventory\/new"><Plus className="h-4 w-4" \/> Add Item<\/Link>\s*<\/Button>/g,
  `<Button className="shrink-0 gap-2" onClick={() => navigate('/inventory/new')}><Plus className="h-4 w-4" /> Add Item</Button>`);
  
  // MaintenanceListPage Button asChild fixes
  content = content.replace(/<Button asChild className="shrink-0 gap-2">\s*<Link to="\/maintenance\/new"><Plus className="h-4 w-4" \/> Schedule Maintenance<\/Link>\s*<\/Button>/g,
  `<Button className="shrink-0 gap-2" onClick={() => navigate('/maintenance/new')}><Plus className="h-4 w-4" /> Schedule Maintenance</Button>`);
  
  // ProjectListPage Button asChild fixes
  content = content.replace(/<Button asChild className="shrink-0 gap-2">\s*<Link to="\/projects\/new"><Plus className="h-4 w-4" \/> New Project<\/Link>\s*<\/Button>/g,
  `<Button className="shrink-0 gap-2" onClick={() => navigate('/projects/new')}><Plus className="h-4 w-4" /> New Project</Button>`);
  
  // WorkshopListPage Button asChild fixes
  content = content.replace(/<Button asChild className="shrink-0 gap-2">\s*<Link to="\/workshops\/new"><Plus className="h-4 w-4" \/> Add Workshop<\/Link>\s*<\/Button>/g,
  `<Button className="shrink-0 gap-2" onClick={() => navigate('/workshops/new')}><Plus className="h-4 w-4" /> Add Workshop</Button>`);
  
  content = content.replace(/<Button variant="outline" asChild>\s*<Link to=\{`\/workshops\/\$\{w\.id\}`\}>Details<\/Link>\s*<\/Button>/g,
  `<Button variant="outline" onClick={() => navigate(\`/workshops/\${w.id}\`)}>Details</Button>`);

  fs.writeFileSync(file, content);
}
console.log('Fixed TypeScript errors');
