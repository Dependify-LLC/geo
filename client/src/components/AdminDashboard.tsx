import { useState, useEffect } from 'react';
import { authApi } from '../api/client';
import { UserPlus, Users, Shield, X, Edit2, Trash2, Check, AlertTriangle } from 'lucide-react';

interface AdminDashboardProps {
    onClose: () => void;
}

export function AdminDashboard({ onClose }: AdminDashboardProps) {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Form state
    const [formData, setFormData] = useState({ id: 0, username: '', password: '', role: 'user' });
    const [actionError, setActionError] = useState('');
    const [actionSuccess, setActionSuccess] = useState('');
    const [userToDelete, setUserToDelete] = useState<any>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await authApi.getUsers();
            setUsers(res.data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({ id: 0, username: '', password: '', role: 'user' });
        setActionError('');
        setActionSuccess('');
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionError('');
        setActionSuccess('');

        try {
            await authApi.createUser(formData);
            setActionSuccess('User created successfully!');
            resetForm();
            fetchUsers();
            setTimeout(() => setShowCreateModal(false), 1500);
        } catch (error: any) {
            setActionError(error.response?.data?.error || 'Failed to create user');
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setActionError('');
        setActionSuccess('');

        try {
            const updateData: any = { username: formData.username, role: formData.role };
            if (formData.password) updateData.password = formData.password;

            await authApi.updateUser(formData.id, updateData);
            setActionSuccess('User updated successfully!');
            fetchUsers();
            setTimeout(() => setShowEditModal(false), 1500);
        } catch (error: any) {
            setActionError(error.response?.data?.error || 'Failed to update user');
        }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            await authApi.deleteUser(userToDelete.id);
            fetchUsers();
            setShowDeleteModal(false);
            setUserToDelete(null);
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to delete user');
        }
    };

    const openEditModal = (user: any) => {
        setFormData({ id: user.id, username: user.username, password: '', role: user.role });
        setShowEditModal(true);
    };

    const openDeleteModal = (user: any) => {
        setUserToDelete(user);
        setShowDeleteModal(true);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">

                {/* Header */}
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
                    <div className="flex items-center gap-3">
                        <Shield className="text-purple-500 w-6 h-6" />
                        <h2 className="text-xl font-bold text-white">Admin Dashboard</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">

                    {/* Stats / Actions */}
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-2 text-gray-300">
                            <Users className="w-5 h-5" />
                            <span>Total Users: <span className="font-bold text-white">{users.length}</span></span>
                        </div>
                        <button
                            onClick={() => { resetForm(); setShowCreateModal(true); }}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <UserPlus size={18} />
                            Create New User
                        </button>
                    </div>

                    {/* Users Table */}
                    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="bg-gray-900/50 text-gray-200 uppercase font-medium">
                                <tr>
                                    <th className="px-6 py-4">ID</th>
                                    <th className="px-6 py-4">Username</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Created At</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {loading ? (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center">Loading users...</td></tr>
                                ) : users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs text-gray-500">#{user.id}</td>
                                        <td className="px-6 py-4 font-medium text-white">{user.username}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs border ${user.role === 'admin'
                                                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                                                    : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                                }`}>
                                                {user.role.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">{new Date(user.createdAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => openEditModal(user)}
                                                    className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded transition-colors"
                                                    title="Edit User"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => openDeleteModal(user)}
                                                    className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                                                    title="Delete User"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Create/Edit User Modal */}
            {(showCreateModal || showEditModal) && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
                    <div className="bg-gray-800 rounded-lg border border-gray-600 w-full max-w-md p-6 shadow-xl">
                        <h3 className="text-lg font-bold text-white mb-4">
                            {showCreateModal ? 'Create New User' : 'Edit User'}
                        </h3>

                        {actionError && <div className="bg-red-500/20 text-red-400 p-3 rounded mb-4 text-sm">{actionError}</div>}
                        {actionSuccess && <div className="bg-green-500/20 text-green-400 p-3 rounded mb-4 text-sm">{actionSuccess}</div>}

                        <form onSubmit={showCreateModal ? handleCreateUser : handleUpdateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Username</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">
                                    {showCreateModal ? 'Password' : 'New Password (leave blank to keep current)'}
                                </label>
                                <input
                                    type="password"
                                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    required={showCreateModal}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Role</label>
                                <select
                                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}
                                    className="px-4 py-2 text-gray-300 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded"
                                >
                                    {showCreateModal ? 'Create User' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && userToDelete && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
                    <div className="bg-gray-800 rounded-lg border border-gray-600 w-full max-w-sm p-6 shadow-xl">
                        <div className="flex items-center gap-3 text-red-400 mb-4">
                            <AlertTriangle size={24} />
                            <h3 className="text-lg font-bold">Delete User?</h3>
                        </div>

                        <p className="text-gray-300 mb-6">
                            Are you sure you want to delete <span className="font-bold text-white">{userToDelete.username}</span>? This action cannot be undone.
                        </p>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="px-4 py-2 text-gray-300 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteUser}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
                            >
                                Delete User
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
