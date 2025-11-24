import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

async function runCrudVerification() {
    try {
        console.log('=== Starting User CRUD Verification ===');

        // 1. Login as Admin
        console.log('\n1. Logging in as Admin...');
        const adminLogin = await axios.post(`${API_URL}/auth/login`, {
            username: 'admin',
            password: 'admin123'
        });
        const adminToken = adminLogin.data.token;
        console.log('✓ Admin logged in successfully');

        // 2. Create a User to Modify
        const tempUsername = `crud_test_${Date.now()}`;
        console.log(`\n2. Creating temp user '${tempUsername}'...`);
        await axios.post(`${API_URL}/auth/users`, {
            username: tempUsername,
            password: 'password123',
            role: 'user'
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('✓ Temp user created');

        // 3. Get User ID
        const usersRes = await axios.get(`${API_URL}/auth/users`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const tempUser = usersRes.data.find((u: any) => u.username === tempUsername);
        if (!tempUser) throw new Error('Temp user not found in list');
        console.log(`✓ Found temp user ID: ${tempUser.id}`);

        // 4. Update User (Change Role)
        console.log('\n4. Updating user role to "admin"...');
        await axios.put(`${API_URL}/auth/users/${tempUser.id}`, {
            role: 'admin'
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('✓ User updated');

        // Verify Update
        const updatedUsersRes = await axios.get(`${API_URL}/auth/users`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const updatedUser = updatedUsersRes.data.find((u: any) => u.id === tempUser.id);
        if (updatedUser.role !== 'admin') throw new Error('User role update failed');
        console.log('✓ Verified user role is now "admin"');

        // 5. Delete User
        console.log('\n5. Deleting user...');
        await axios.delete(`${API_URL}/auth/users/${tempUser.id}`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('✓ User deleted');

        // Verify Deletion
        const finalUsersRes = await axios.get(`${API_URL}/auth/users`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const deletedUser = finalUsersRes.data.find((u: any) => u.id === tempUser.id);
        if (deletedUser) throw new Error('User still exists after deletion');
        console.log('✓ Verified user is gone');

        console.log('\n=== CRUD Verification Completed Successfully ===');

    } catch (error: any) {
        console.error('\n❌ Verification Failed:', error.response?.data || error.message);
    }
}

runCrudVerification();
