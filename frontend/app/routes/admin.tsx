import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';

interface AssociatedUser {
    user_id: number;
    email: string;
}

interface TrackerItem {
    id: number;
    url: string;
    name: string;
    website: string;
    size: string | null;
    last_status: string;
    check_interval_seconds: number;
    last_checked_at: string | null;
    users: AssociatedUser[];
}

// Human-friendly rendering of an interval in seconds (e.g. 300 -> "5m").
function formatInterval(seconds: number): string {
    if (!seconds || seconds < 1) return '—';
    if (seconds % 3600 === 0) return `${seconds / 3600}h`;
    if (seconds % 60 === 0) return `${seconds / 60}m`;
    return `${seconds}s`;
}

const statusStyles: Record<string, string> = {
    in_stock: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    out_of_stock: 'bg-neutral-700/40 text-neutral-400 border-neutral-600/50',
    error: 'bg-red-500/15 text-red-400 border-red-500/30',
};

// Inline editor for a single item's check interval. Keeps its own draft state
// so typing in one row never touches another.
function IntervalEditor({ item, onSave }: { item: TrackerItem; onSave: (id: number, seconds: number) => Promise<void> }) {
    const [value, setValue] = useState(String(item.check_interval_seconds));
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setValue(String(item.check_interval_seconds));
    }, [item.check_interval_seconds]);

    const dirty = value !== String(item.check_interval_seconds);

    const save = async () => {
        const seconds = parseInt(value, 10);
        if (!Number.isInteger(seconds) || seconds < 1) return;
        setSaving(true);
        try {
            await onSave(item.id, seconds);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Check every</span>
            <input
                type="number"
                min={1}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-24 rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-1.5 text-sm text-neutral-200 outline-none focus:border-emerald-500"
            />
            <span className="text-sm text-neutral-500">sec ({formatInterval(item.check_interval_seconds)})</span>
            <button
                onClick={save}
                disabled={!dirty || saving}
                className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-300 transition-colors enabled:hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
                {saving ? 'Saving…' : 'Save'}
            </button>
        </div>
    );
}

export default function AdminPage() {
    const [users, setUsers] = useState<{ id: number, email: string }[]>([]);
    const [items, setItems] = useState<TrackerItem[]>([]);

    // Add User form state
    const [email, setEmail] = useState('');

    // Add Item form state
    const [url, setUrl] = useState('');
    const [name, setName] = useState('');
    const [website, setWebsite] = useState('target');
    const [size, setSize] = useState('');
    const [userId, setUserId] = useState('');
    const [checkInterval, setCheckInterval] = useState('300');

    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'success' | 'error'>('success');

    const notify = (text: string, type: 'success' | 'error' = 'success') => {
        setMessage(text);
        setMessageType(type);
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch(`/api/users`);
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
                if (data.length > 0 && !userId) {
                    setUserId(data[0].id.toString());
                }
            }
        } catch (e) {
            console.error('Failed to fetch users', e);
        }
    };

    const fetchItems = async () => {
        try {
            const res = await fetch(`/api/items`);
            if (res.ok) {
                const data = await res.json();
                const grouped = data.reduce((acc: any, row: any) => {
                    if (!acc[row.id]) {
                        acc[row.id] = {
                            id: row.id,
                            url: row.url,
                            name: row.name,
                            website: row.website,
                            size: row.size,
                            last_status: row.last_status,
                            check_interval_seconds: row.check_interval_seconds,
                            last_checked_at: row.last_checked_at,
                            users: []
                        };
                    }
                    if (row.user_id) {
                        // Prevent duplicate users if JOIN produces multiple
                        if (!acc[row.id].users.some((u: any) => u.user_id === row.user_id)) {
                            acc[row.id].users.push({ user_id: row.user_id, email: row.email });
                        }
                    }
                    return acc;
                }, {});
                setItems(Object.values(grouped));
            }
        } catch (e) {
            console.error('Failed to fetch items', e);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchItems();
    }, []);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`/api/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            if (res.ok) {
                notify('User added successfully!');
                setEmail('');
                fetchUsers();
            } else {
                notify('Failed to add user.', 'error');
            }
        } catch (e) {
            notify('Error adding user.', 'error');
        }
    };

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) {
            notify('Please select a user first.', 'error');
            return;
        }
        const interval = parseInt(checkInterval, 10);
        if (!Number.isInteger(interval) || interval < 1) {
            notify('Check interval must be a positive number of seconds.', 'error');
            return;
        }
        try {
            const res = await fetch(`/api/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: parseInt(userId),
                    url,
                    name,
                    website,
                    size,
                    checkIntervalSeconds: interval
                })
            });
            if (res.ok) {
                notify('Item added successfully!');
                setUrl('');
                setName('');
                setSize('');
                fetchItems();
            } else {
                notify('Failed to add item.', 'error');
            }
        } catch (e) {
            notify('Error adding item.', 'error');
        }
    };

    const handleUpdateInterval = async (itemId: number, seconds: number) => {
        try {
            const res = await fetch(`/api/items/${itemId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ checkIntervalSeconds: seconds })
            });
            if (res.ok) {
                notify('Check interval updated.');
                fetchItems();
            } else {
                notify('Failed to update interval.', 'error');
            }
        } catch (e) {
            notify('Error updating interval.', 'error');
        }
    };

    const handleRemoveUserFromItem = async (itemId: number, removeUserId: number) => {
        try {
            const res = await fetch(`/api/user-items`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: removeUserId, itemId })
            });
            if (res.ok) {
                notify('User removed from item.');
                fetchItems();
            } else {
                notify('Failed to remove user from item.', 'error');
            }
        } catch (e) {
            notify('Error removing user from item.', 'error');
        }
    };

    const handleAddUserToItem = async (itemId: number, attachUserId: number) => {
        try {
            const res = await fetch(`/api/user-items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: attachUserId, itemId })
            });
            if (res.ok) {
                notify('User attached to item.');
                fetchItems();
            } else {
                notify('Failed to attach user to item.', 'error');
            }
        } catch (e) {
            notify('Error attaching user to item.', 'error');
        }
    };

    const handleDeleteItem = async (itemId: number) => {
        try {
            const res = await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
            if (res.ok) {
                notify('Item deleted completely.');
                fetchItems();
            }
        } catch (e) {
            notify('Error deleting item.', 'error');
        }
    };

    const inputClass =
        'bg-neutral-900 border border-neutral-600 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all';

    return (
        <div className="relative min-h-screen bg-neutral-950 text-neutral-100">
            {/* ambient glow */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-emerald-500/10 to-transparent" />

            <div className="relative mx-auto max-w-4xl px-6 py-10">
                <header className="mb-10 flex items-center justify-between">
                    <Link to="/" className="text-sm font-medium text-neutral-400 transition-colors hover:text-white">
                        ← stocked
                    </Link>
                    <span className="text-sm text-neutral-600">Admin dashboard</span>
                </header>

                <h1 className="mb-8 text-center text-4xl font-extrabold tracking-tight">
                    <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                        Tracker Admin
                    </span>
                </h1>

                {message && (
                    <div
                        className={`mb-6 rounded-lg border p-4 text-center transition-opacity ${
                            messageType === 'error'
                                ? 'border-red-500/20 bg-red-500/10 text-red-400'
                                : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                        }`}
                    >
                        {message}
                    </div>
                )}

                <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-2">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-xl transition-transform duration-300 hover:scale-[1.01]">
                        <h2 className="mb-6 border-b border-neutral-800 pb-2 text-2xl font-semibold text-neutral-200">Add New User</h2>
                        <form onSubmit={handleAddUser} className="flex flex-col space-y-4">
                            <div className="flex flex-col space-y-2">
                                <label htmlFor="email" className="text-sm font-medium text-neutral-400">Email Address</label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={inputClass}
                                    placeholder="user@example.com"
                                />
                            </div>
                            <button type="submit" className="self-end rounded-lg bg-emerald-500 px-6 py-2 font-semibold text-white shadow-lg transition-all duration-200 hover:bg-emerald-400 hover:shadow-emerald-500/25">
                                Create User
                            </button>
                        </form>
                    </div>

                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-xl transition-transform duration-300 hover:scale-[1.01]">
                        <h2 className="mb-6 border-b border-neutral-800 pb-2 text-2xl font-semibold text-neutral-200">Create New Item</h2>
                        <form onSubmit={handleAddItem} className="space-y-4">
                            <div className="flex flex-col space-y-2">
                                <label htmlFor="user" className="text-sm font-medium text-neutral-400">Associate User</label>
                                <select
                                    id="user"
                                    value={userId}
                                    onChange={(e) => setUserId(e.target.value)}
                                    required
                                    className={`${inputClass} text-neutral-200`}
                                >
                                    {users.length === 0 && <option value="">No users available</option>}
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.email}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col space-y-2">
                                    <label htmlFor="name" className="text-sm font-medium text-neutral-400">Item Name</label>
                                    <input
                                        id="name"
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className={inputClass}
                                        placeholder="e.g. PlayStation 5"
                                    />
                                </div>
                                <div className="flex flex-col space-y-2">
                                    <label htmlFor="url" className="text-sm font-medium text-neutral-400">Item URL</label>
                                    <input
                                        id="url"
                                        type="url"
                                        required
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col space-y-2">
                                    <label htmlFor="website" className="text-sm font-medium text-neutral-400">Website</label>
                                    <select
                                        id="website"
                                        value={website}
                                        onChange={(e) => setWebsite(e.target.value)}
                                        className={`${inputClass} text-neutral-200`}
                                    >
                                        <option value="target">Target</option>
                                        <option value="vibram">Vibram</option>
                                        <option value="amazon">Amazon</option>
                                        <option value="rhode">Rhode</option>
                                    </select>
                                </div>
                                <div className="flex flex-col space-y-2">
                                    <label htmlFor="size" className="text-sm font-medium text-neutral-400">Size (Optional)</label>
                                    <input
                                        id="size"
                                        type="text"
                                        value={size}
                                        onChange={(e) => setSize(e.target.value)}
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col space-y-2">
                                <label htmlFor="interval" className="text-sm font-medium text-neutral-400">
                                    Check interval (seconds)
                                </label>
                                <input
                                    id="interval"
                                    type="number"
                                    min={1}
                                    required
                                    value={checkInterval}
                                    onChange={(e) => setCheckInterval(e.target.value)}
                                    className={inputClass}
                                    placeholder="300"
                                />
                                <span className="text-xs text-neutral-500">
                                    How often this item is checked — currently {formatInterval(parseInt(checkInterval, 10) || 0)}.
                                </span>
                            </div>

                            <button type="submit" className="mt-2 w-full rounded-lg bg-cyan-500 px-8 py-2.5 font-semibold text-white shadow-lg transition-all duration-200 hover:bg-cyan-400 hover:shadow-cyan-500/25">
                                Create Tracker Item
                            </button>
                        </form>
                    </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-8 shadow-xl">
                    <h2 className="mb-6 border-b border-neutral-800 pb-2 text-2xl font-semibold text-neutral-200">Active Items ({items.length})</h2>
                    {items.length === 0 ? (
                        <p className="py-8 text-center italic text-neutral-500">No specific items are currently being tracked.</p>
                    ) : (
                        <div className="space-y-6">
                            {items.map(item => (
                                <div key={item.id} className="rounded-xl border border-neutral-800 bg-neutral-950 p-5 transition-colors hover:border-neutral-700">
                                    <div className="mb-4 flex items-start justify-between">
                                        <div>
                                            <div className="mb-1 flex items-center gap-3">
                                                <h3 className="text-xl font-bold text-emerald-400">{item.name}</h3>
                                                <span className={`rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${statusStyles[item.last_status] ?? statusStyles.out_of_stock}`}>
                                                    {item.last_status?.replace(/_/g, ' ') ?? 'unknown'}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-2 text-sm">
                                                <span className="rounded-md bg-neutral-800 px-2.5 py-1 font-mono capitalize text-neutral-400">{item.website}</span>
                                                {item.size && <span className="rounded-md bg-neutral-800 px-2.5 py-1 font-mono text-neutral-400">Size: {item.size}</span>}
                                                <a href={item.url} target="_blank" rel="noreferrer" className="rounded-md bg-cyan-900/30 px-2.5 py-1 text-cyan-400 transition-colors hover:bg-cyan-900/50">
                                                    Link ↗
                                                </a>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteItem(item.id)}
                                            className="rounded-lg bg-red-400/10 px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-400/20 hover:text-red-300"
                                        >
                                            Delete Item
                                        </button>
                                    </div>

                                    <div className="border-t border-neutral-800 py-4">
                                        <IntervalEditor item={item} onSave={handleUpdateInterval} />
                                    </div>

                                    <div className="border-t border-neutral-800 pt-4">
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Attached Users</p>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {item.users.length === 0 ? (
                                                <span className="pr-2 text-sm italic text-neutral-600">No users attached</span>
                                            ) : (
                                                item.users.map(u => (
                                                    <div key={u.user_id} className="group flex items-center rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5">
                                                        <span className="mr-2 text-sm font-medium text-neutral-300">{u.email}</span>
                                                        <button
                                                            onClick={() => handleRemoveUserFromItem(item.id, u.user_id)}
                                                            className="text-neutral-500 transition-colors hover:text-red-400 focus:outline-none"
                                                            title="Remove user from item"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ))
                                            )}

                                            <select
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        handleAddUserToItem(item.id, parseInt(e.target.value));
                                                    }
                                                    e.target.value = '';
                                                }}
                                                className="ml-2 cursor-pointer appearance-none rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-sm font-medium text-neutral-400 shadow-sm outline-none focus:border-emerald-500"
                                            >
                                                <option value="">+ Add User</option>
                                                {users
                                                    .filter(u => !item.users.some(iu => iu.user_id === u.id))
                                                    .map(u => (
                                                        <option key={u.id} value={u.id}>{u.email}</option>
                                                    ))
                                                }
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
