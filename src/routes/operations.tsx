import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bus, CheckCircle2, Library, Package, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, SectionCard } from "@/components/kit/page";
import { KpiCard } from "@/components/kit/kpi-card";
import { StatusBadge } from "@/components/kit/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useStudents } from "@/data/student-store";

type InventoryItem = { id: string; name: string; category: string; quantity: number; minimum: number; location: string };
type LibraryBook = { id: string; title: string; author: string; copies: number; available: number; category: string };
type TransportRoute = { id: string; name: string; driver: string; vehicle: string; students: number; assignedStudentIds?: string[]; status: "Active" | "Maintenance" };
type HostelRoom = { id: string; house: string; room: string; capacity: number; occupied: number; assignedStudentIds?: string[]; warden: string };
type BookLoan = { id: string; bookId: string; studentId: string; issuedAt: string; status: "On loan" | "Returned" };

const seedInventory: InventoryItem[] = [
  { id: "INV-001", name: "A4 exercise books", category: "Learning materials", quantity: 420, minimum: 100, location: "Main store" },
  { id: "INV-002", name: "Student desks", category: "Furniture", quantity: 18, minimum: 25, location: "Furniture store" },
  { id: "INV-003", name: "First aid kits", category: "Health & safety", quantity: 8, minimum: 4, location: "Front office" },
];
const seedBooks: LibraryBook[] = [
  { id: "LIB-001", title: "New Oxford Secondary Mathematics", author: "A. O. Adegoke", copies: 32, available: 27, category: "Mathematics" },
  { id: "LIB-002", title: "Essential English Grammar", author: "M. O. Yusuf", copies: 24, available: 24, category: "English" },
  { id: "LIB-003", title: "Biology for Senior Secondary", author: "N. E. Okeke", copies: 18, available: 14, category: "Sciences" },
];
const seedRoutes: TransportRoute[] = [
  { id: "BUS-001", name: "Ikeja corridor", driver: "Mr. Ibrahim Musa", vehicle: "GMC-04 · Toyota Coaster", students: 18, status: "Active" },
  { id: "BUS-002", name: "Surulere corridor", driver: "Mrs. Amina Bello", vehicle: "GMC-07 · Hiace Bus", students: 14, status: "Active" },
  { id: "BUS-003", name: "Lekki corridor", driver: "Mr. Chinedu Obi", vehicle: "GMC-02 · Toyota Hiace", students: 0, status: "Maintenance" },
];
const seedRooms: HostelRoom[] = [
  { id: "HST-001", house: "Male hostel", room: "A-01", capacity: 8, occupied: 7, warden: "Mr. Sunday Okafor" },
  { id: "HST-002", house: "Female hostel", room: "B-03", capacity: 8, occupied: 6, warden: "Mrs. Grace Nwosu" },
  { id: "HST-003", house: "Male hostel", room: "A-02", capacity: 8, occupied: 8, warden: "Mr. Sunday Okafor" },
];

function stored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(window.localStorage.getItem(key) ?? "null") ?? fallback; } catch { return fallback; }
}

export const Route = createFileRoute("/operations")({
  head: () => ({ meta: [{ title: "Operations — EduCore" }, { name: "description", content: "Library, inventory, transport and hostel operations." }, { name: "robots", content: "noindex" }] }),
  component: OperationsPage,
});

function OperationsPage() {
  const [inventory, setInventory] = useState(() => stored("educore.operations-inventory", seedInventory));
  const [books, setBooks] = useState(() => stored("educore.operations-library", seedBooks));
  const [routes, setRoutes] = useState(() => stored("educore.operations-routes", seedRoutes));
  const [rooms, setRooms] = useState(() => stored("educore.operations-hostel", seedRooms));
  const [loans, setLoans] = useState<BookLoan[]>(() => stored("educore.operations-loans", []));
  const students = useStudents();
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<"inventory" | "library" | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("General");
  const [action, setAction] = useState<"stock" | "loan" | "transport" | "hostel" | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [movement, setMovement] = useState<"in" | "out">("in");

  const persist = <T,>(key: string, value: T) => window.localStorage.setItem(key, JSON.stringify(value));
  const addItem = () => {
    if (!name.trim()) { toast.error("Enter a name before saving"); return; }
    if (dialog === "inventory") {
      const next = [...inventory, { id: `INV-${Date.now()}`, name: name.trim(), category, quantity: 0, minimum: 1, location: "Main store" }];
      setInventory(next); persist("educore.operations-inventory", next);
    } else {
      const next = [...books, { id: `LIB-${Date.now()}`, title: name.trim(), author: "To be catalogued", copies: 0, available: 0, category }];
      setBooks(next); persist("educore.operations-library", next);
    }
    setName(""); setDialog(null); toast.success("Record added to operations");
  };
  const matches = (value: string) => value.toLowerCase().includes(query.toLowerCase());
  const runAction = () => {
    const count = Number(quantity);
    if (!selectedId || !selectedStudentId) { toast.error("Select the required records"); return; }
    if (action === "stock") {
      if (!count || count < 1) { toast.error("Enter a valid quantity"); return; }
      const next = inventory.map((item) => item.id === selectedId ? { ...item, quantity: Math.max(0, item.quantity + (movement === "in" ? count : -count)) } : item);
      if (next.find((item) => item.id === selectedId)!.quantity === 0 && movement === "out") { toast.error("Stock cannot go below zero"); return; }
      setInventory(next); persist("educore.operations-inventory", next); toast.success("Stock movement recorded");
    } else if (action === "loan") {
      const book = books.find((item) => item.id === selectedId);
      if (!book || book.available < 1) { toast.error("No available copy for this title"); return; }
      const nextBooks = books.map((item) => item.id === selectedId ? { ...item, available: item.available - 1 } : item);
      const nextLoans = [...loans, { id: `LOAN-${Date.now()}`, bookId: selectedId, studentId: selectedStudentId, issuedAt: new Date().toISOString(), status: "On loan" as const }];
      setBooks(nextBooks); setLoans(nextLoans); persist("educore.operations-library", nextBooks); persist("educore.operations-loans", nextLoans); toast.success("Book loan recorded");
    } else if (action === "transport") {
      const route = routes.find((item) => item.id === selectedId);
      if (!route || route.assignedStudentIds?.includes(selectedStudentId)) { toast.error("This student is already assigned to the route"); return; }
      const next = routes.map((item) => item.id === selectedId ? { ...item, students: item.students + 1, assignedStudentIds: [...(item.assignedStudentIds ?? []), selectedStudentId] } : item);
      setRoutes(next); persist("educore.operations-routes", next); toast.success("Student assigned to transport route");
    } else {
      const room = rooms.find((item) => item.id === selectedId);
      if (!room || room.occupied >= room.capacity) { toast.error("This hostel room is full"); return; }
      if (room.assignedStudentIds?.includes(selectedStudentId)) { toast.error("This student is already placed in the room"); return; }
      const next = rooms.map((item) => item.id === selectedId ? { ...item, occupied: item.occupied + 1, assignedStudentIds: [...(item.assignedStudentIds ?? []), selectedStudentId] } : item);
      setRooms(next); persist("educore.operations-hostel", next); toast.success("Student placed in hostel room");
    }
    setAction(null); setSelectedId("");
  };

  return <AppShell>
    <PageHeader title="Operations" description="Coordinate the physical services that keep the school day running." breadcrumbs={[{ label: "EduCore", to: "/dashboard" }, { label: "Operations" }]} actions={<Button size="sm" onClick={() => setDialog("inventory")}><Plus className="size-4" /> Add inventory</Button>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard label="Library titles" value={`${books.length}`} sub={`${books.reduce((sum, book) => sum + book.available, 0)} copies available`} icon={Library} />
      <KpiCard label="Inventory items" value={`${inventory.length}`} sub={`${inventory.filter((item) => item.quantity < item.minimum).length} below minimum`} icon={Package} tone={inventory.some((item) => item.quantity < item.minimum) ? "warning" : "default"} />
      <KpiCard label="Active bus routes" value={`${routes.filter((route) => route.status === "Active").length}`} sub={`${routes.reduce((sum, route) => sum + route.students, 0)} assigned students`} icon={Bus} />
      <KpiCard label="Hostel occupancy" value={`${rooms.reduce((sum, room) => sum + room.occupied, 0)}/${rooms.reduce((sum, room) => sum + room.capacity, 0)}`} sub={`${rooms.length} rooms configured`} icon={Users} />
    </div>
    <div className="mt-6 flex items-center gap-2 border-b border-border pb-3"><Search className="size-4 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search operations records" className="h-8 max-w-sm border-0 px-0 shadow-none focus-visible:ring-0" aria-label="Search operations records" /></div>
    <div className="mt-4 grid gap-4 xl:grid-cols-2">
      <SectionCard title="Inventory & supplies" description="Track stock levels, locations and replenishment needs." action={<div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setAction("stock")}>Move stock</Button><Button variant="outline" size="sm" onClick={() => setDialog("inventory")}><Plus className="size-4" /> Add item</Button></div>} bodyClassName="p-0"><div className="divide-y divide-border">{inventory.filter((item) => matches(`${item.name} ${item.category}`)).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 px-5 py-3"><div><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.category} · {item.location}</p></div><div className="flex items-center gap-3"><span className="tabular font-semibold">{item.quantity} units</span>{item.quantity < item.minimum ? <StatusBadge tone="warning">Reorder</StatusBadge> : <StatusBadge tone="success">In stock</StatusBadge>}</div></div>)}</div></SectionCard>
      <SectionCard title="Library catalogue" description="Catalogue resources and monitor available copies." action={<div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setAction("loan")}>Issue loan</Button><Button variant="outline" size="sm" onClick={() => setDialog("library")}><Plus className="size-4" /> Add title</Button></div>} bodyClassName="p-0"><div className="divide-y divide-border">{books.filter((book) => matches(`${book.title} ${book.author} ${book.category}`)).map((book) => <div key={book.id} className="flex items-center justify-between gap-3 px-5 py-3"><div><p className="font-medium">{book.title}</p><p className="text-xs text-muted-foreground">{book.author} · {book.category}</p></div><p className="text-right text-sm tabular"><span className="font-semibold">{book.available}</span>/{book.copies} available</p></div>)}</div>{loans.filter((loan) => loan.status === "On loan").slice(-3).map((loan) => <div key={loan.id} className="flex items-center justify-between border-t border-border px-5 py-2 text-xs"><span>Loan: {books.find((book) => book.id === loan.bookId)?.title} · {students.find((student) => student.id === loan.studentId)?.firstName}</span><Button variant="ghost" size="sm" onClick={() => { const nextBooks = books.map((book) => book.id === loan.bookId ? { ...book, available: Math.min(book.copies, book.available + 1) } : book); const nextLoans = loans.map((item) => item.id === loan.id ? { ...item, status: "Returned" as const } : item); setBooks(nextBooks); setLoans(nextLoans); persist("educore.operations-library", nextBooks); persist("educore.operations-loans", nextLoans); toast.success("Book returned"); }}>Return</Button></div>)}</SectionCard>
      <SectionCard title="School transport" description="Manage routes, assigned drivers and vehicle readiness." action={<Button variant="outline" size="sm" onClick={() => setAction("transport")}><Bus className="size-4" /> Assign student</Button>} bodyClassName="p-0"><div className="divide-y divide-border">{routes.filter((route) => matches(`${route.name} ${route.driver} ${route.vehicle}`)).map((route) => <div key={route.id} className="flex items-center justify-between gap-3 px-5 py-3"><div><p className="font-medium">{route.name}</p><p className="text-xs text-muted-foreground">{route.vehicle} · {route.driver}</p></div><div className="flex items-center gap-3"><span className="text-sm tabular">{route.students} students</span><StatusBadge tone={route.status === "Active" ? "success" : "warning"}>{route.status}</StatusBadge></div></div>)}</div></SectionCard>
      <SectionCard title="Hostel allocation" description="Monitor room capacity and boarding-house assignments." action={<Button variant="outline" size="sm" onClick={() => setAction("hostel")}><Users className="size-4" /> Place student</Button>} bodyClassName="p-0"><div className="divide-y divide-border">{rooms.filter((room) => matches(`${room.house} ${room.room} ${room.warden}`)).map((room) => <div key={room.id} className="flex items-center justify-between gap-3 px-5 py-3"><div><p className="font-medium">{room.house} · Room {room.room}</p><p className="text-xs text-muted-foreground">Warden: {room.warden}</p></div><div className="flex items-center gap-3"><span className="text-sm tabular">{room.occupied}/{room.capacity}</span><StatusBadge tone={room.occupied >= room.capacity ? "warning" : "success"}>{room.occupied >= room.capacity ? "Full" : "Available"}</StatusBadge></div></div>)}</div></SectionCard>
    </div>
    <Dialog open={action !== null} onOpenChange={(open) => !open && setAction(null)}><DialogContent><DialogHeader><DialogTitle>{action === "stock" ? "Move stock" : action === "loan" ? "Issue library loan" : action === "transport" ? "Assign transport route" : "Place student in hostel"}</DialogTitle><DialogDescription>Save this operational action to the school record.</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-1.5"><Label>Student</Label><Select value={selectedStudentId} onValueChange={setSelectedStudentId}><SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger><SelectContent>{students.map((student) => <SelectItem key={student.id} value={student.id}>{student.firstName} {student.lastName} · {student.admissionNo}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label>{action === "stock" ? "Inventory item" : action === "loan" ? "Book title" : action === "transport" ? "Route" : "Room"}</Label><Select value={selectedId} onValueChange={setSelectedId}><SelectTrigger><SelectValue placeholder="Select record" /></SelectTrigger><SelectContent>{action === "stock" && inventory.map((item) => <SelectItem key={item.id} value={item.id}>{item.name} · {item.quantity} units</SelectItem>)}{action === "loan" && books.map((book) => <SelectItem key={book.id} value={book.id}>{book.title} · {book.available} available</SelectItem>)}{action === "transport" && routes.filter((route) => route.status === "Active").map((route) => <SelectItem key={route.id} value={route.id}>{route.name} · {route.students} students</SelectItem>)}{action === "hostel" && rooms.filter((room) => room.occupied < room.capacity).map((room) => <SelectItem key={room.id} value={room.id}>{room.house} · Room {room.room}</SelectItem>)}</SelectContent></Select></div>{action === "stock" && <><div className="space-y-1.5"><Label>Movement</Label><Select value={movement} onValueChange={(value) => setMovement(value as "in" | "out")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="in">Stock in</SelectItem><SelectItem value="out">Stock out</SelectItem></SelectContent></Select></div><div className="space-y-1.5"><Label htmlFor="stock-quantity">Quantity</Label><Input id="stock-quantity" type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></div></>}</div><DialogFooter><Button variant="outline" onClick={() => setAction(null)}>Cancel</Button><Button onClick={runAction}><CheckCircle2 className="size-4" /> Save action</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}><DialogContent><DialogHeader><DialogTitle>{dialog === "library" ? "Add library title" : "Add inventory item"}</DialogTitle><DialogDescription>This record is saved locally and available to the operations team immediately.</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-1.5"><Label htmlFor="operation-name">{dialog === "library" ? "Book title" : "Item name"}</Label><Input id="operation-name" value={name} onChange={(event) => setName(event.target.value)} placeholder={dialog === "library" ? "Physics for Senior Secondary" : "Whiteboard markers"} /></div><div className="space-y-1.5"><Label>Category</Label><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="General">General</SelectItem><SelectItem value="Learning materials">Learning materials</SelectItem><SelectItem value="Furniture">Furniture</SelectItem><SelectItem value="Sciences">Sciences</SelectItem><SelectItem value="English">English</SelectItem></SelectContent></Select></div></div><DialogFooter><Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button><Button onClick={addItem}><CheckCircle2 className="size-4" /> Save record</Button></DialogFooter></DialogContent></Dialog>
  </AppShell>;
}
