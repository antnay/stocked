import React, { useState, useEffect } from 'react';
import { API_BASE } from '~/root';

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
    users: AssociatedUser[];
}


export default function AdminPage() {
    const [users, setUsers] = useState<{id: number, email: string}[]>([]);
    const [items, setItems] = useState<TrackerItem[]>([]);
    
    // Add User form state
    const [email, setEmail] = useState('');
    
    // Add Item form state
    const [url, setUrl] = useState('');
    const [name, setName] = useState('');
    const [website, setWebsite] = useState('target');
    const [size, setSize] = useState('');
    const [userId, setUserId] = useState('');

    const [message, setMessage] = useState('');

    const fetchUsers = async () => {
        try {
            const res = await fetch(`http://${API_BASE}/api/users`);
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
            const res = await fetch(`http://${API_BASE}/api/users`);
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
            const res = await fetch(`http://${API_BASE}/api/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            if (res.ok) {
                setMessage('User added successfully!');
                setEmail('');
                fetchUsers(); // Refresh users list
            } else {
                setMessage('Failed to add user.');
            }
        } catch (e) {
            setMessage('Error adding user.');
        }
    };

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) {
            setMessage('Please select a user first.');
            return;
        }
        try {
            const res = await fetch(`http://${API_BASE}/api/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: parseInt(userId),
                    url,
                    name,
                    website,
                    size
                })
            });
            if (res.ok) {
                setMessage('Item added successfully!');
                setUrl('');
                setName('');
                setSize('');
                fetchItems();
            } else {
                setMessage('Failed to add item.');
            }
        } catch (e) {
            setMessage('Error adding item.');
        }
    };

    const handleRemoveUserFromItem = async (itemId: number, removeUserId: number) => {
        try {
            const res = await fetch(`http://${API_BASE}/api/user-items`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: removeUserId, itemId })
            });
            if (res.ok) {
                setMessage('User removed from item.');
                fetchItems();
            } else {
                setMessage('Failed to remove user from item.');
            }
        } catch (e) {
            setMessage('Error removing user from item.');
        }
    };

    const handleAddUserToItem = async (itemId: number, attachUserId: number) => {
        try {
            const res = await fetch(`http://${API_BASE}/api/user-items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: attachUserId, itemId })
            });
            if (res.ok) {
                setMessage('User attached to item.');
                fetchItems();
            } else {
                setMessage('Failed to attach user to item.');
            }
        } catch (e) {
            setMessage('Error attaching user to item.');
        }
    };

    const handleDeleteItem = async (itemId: number) => {
        try {
            const res = await fetch(`http://${API_BASE}/api/items/${itemId}`, { method: 'DELETE' });
            if (res.ok) {
                setMessage('Item deleted completely.');
                fetchItems();
            }
        } catch (e) {
            setMessage('Error deleting item.');
        }
    };

    return (
        <div className="min-h-screen bg-neutral-900 text-neutral-100 p-8 flex flex-col items-center">
            <div className="max-w-4xl w-full">
                <h1 className="text-4xl font-bold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                    Tracker Admin
                </h1>
                
                {message && (
                    <div className="mb-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-center animate-pulse transition-opacity">
                        {message}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    <div className="bg-neutral-800 rounded-2xl p-8 shadow-xl border border-neutral-700 transition-transform hover:scale-[1.01] duration-300">
                        <h2 className="text-2xl font-semibold mb-6 text-neutral-200 border-b border-neutral-700 pb-2">Add New User</h2>
                        <form onSubmit={handleAddUser} className="flex flex-col space-y-4">
                            <div className="flex flex-col space-y-2">
                                <label htmlFor="email" className="text-sm font-medium text-neutral-400">Email Address</label>
                                <input 
                                    id="email" 
                                    type="email" 
                                    required 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-neutral-900 border border-neutral-600 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                    placeholder="user@example.com"
                                />
                            </div>
                            <button type="submit" className="self-end bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-2 px-6 rounded-lg shadow-lg hover:shadow-emerald-500/25 transition-all duration-200">
                                Create User
                            </button>
                        </form>
                    </div>

                    <div className="bg-neutral-800 rounded-2xl p-8 shadow-xl border border-neutral-700 transition-transform hover:scale-[1.01] duration-300">
                        <h2 className="text-2xl font-semibold mb-6 text-neutral-200 border-b border-neutral-700 pb-2">Create New Item</h2>
                        <form onSubmit={handleAddItem} className="space-y-4">
                            <div className="flex flex-col space-y-2">
                                <label htmlFor="user" className="text-sm font-medium text-neutral-400">Associate User</label>
                                <select 
                                    id="user" 
                                    value={userId}
                                    onChange={(e) => setUserId(e.target.value)}
                                    required
                                    className="bg-neutral-900 border border-neutral-600 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-neutral-200"
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
                                        className="bg-neutral-900 border border-neutral-600 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
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
                                        className="bg-neutral-900 border border-neutral-600 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
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
                                        className="bg-neutral-900 border border-neutral-600 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-neutral-200"
                                    >
                                        <option value="target">Target</option>
                                        <option value="vibram">Vibram</option>
                                        <option value="amazon">Amazon</option>
                                    </select>
                                </div>
                                <div className="flex flex-col space-y-2">
                                    <label htmlFor="size" className="text-sm font-medium text-neutral-400">Size (Optional)</label>
                                    <input 
                                        id="size" 
                                        type="text" 
                                        value={size}
                                        onChange={(e) => setSize(e.target.value)}
                                        className="bg-neutral-900 border border-neutral-600 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-white font-semibold py-2.5 px-8 rounded-lg shadow-lg hover:shadow-cyan-500/25 transition-all duration-200 mt-2">
                                Create Tracker Item
                            </button>
                        </form>
                    </div>
                </div>

                <div className="bg-neutral-800 rounded-2xl p-8 shadow-xl border border-neutral-700">
                    <h2 className="text-2xl font-semibold mb-6 text-neutral-200 border-b border-neutral-700 pb-2">Active Items ({items.length})</h2>
                    {items.length === 0 ? (
                        <p className="text-neutral-500 italic text-center py-8">No specific items are currently being tracked.</p>
                    ) : (
                        <div className="space-y-6">
                            {items.map(item => (
                                <div key={item.id} className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 hover:border-neutral-600 transition-colors">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-emerald-400 mb-1">{item.name}</h3>
                                            <div className="flex flex-wrap gap-2 text-sm">
                                                <span className="px-2.5 py-1 bg-neutral-800 rounded-md text-neutral-400 font-mono capitalize">{item.website}</span>
                                                {item.size && <span className="px-2.5 py-1 bg-neutral-800 rounded-md text-neutral-400 font-mono">Size: {item.size}</span>}
                                                <a href={item.url} target="_blank" rel="noreferrer" className="px-2.5 py-1 bg-cyan-900/30 text-cyan-400 rounded-md hover:bg-cyan-900/50 transition-colors">
                                                    Link ↗
                                                </a>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteItem(item.id)}
                                            className="text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            Delete Item
                                        </button>
                                    </div>
                                    
                                    <div className="pt-4 border-t border-neutral-800">
                                        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Attached Users</p>
                                        <div className="flex flex-wrap gap-2 items-center">
                                            {item.users.length === 0 ? (
                                                <span className="text-neutral-600 text-sm italic pr-2">No users attached</span>
                                            ) : (
                                                item.users.map(u => (
                                                    <div key={u.user_id} className="group flex items-center bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5">
                                                        <span className="text-sm text-neutral-300 font-medium mr-2">{u.email}</span>
                                                        <button 
                                                            onClick={() => handleRemoveUserFromItem(item.id, u.user_id)}
                                                            className="text-neutral-500 hover:text-red-400 focus:outline-none transition-colors"
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
                                                className="bg-neutral-800 text-neutral-400 border border-neutral-700 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-emerald-500 font-medium ml-2 shadow-sm appearance-none cursor-pointer"
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
