const mysql = require('mysql2/promise');

async function getAllUsers() {
    return await executeQuery('SELECT * FROM test;')
}

async function insertNewUser(newTestRow) {
    return await executeQuery('INSERT INTO test (testRow) VALUES (?)',
        [newTestRow])
}

async function updateUser(userId, updatedTestRow) {
    return await executeQuery('UPDATE test SET testRow = ? WHERE id = ?', [updatedTestRow, userId]);
}

async function deleteUser(userId) {
    return await executeQuery('DELETE FROM test WHERE id = ?', [userId]);
}

async function executeQuery(sql, params) {
    // TODO: change params
    const connection = await mysql.createConnection({
        user: 'skillsbattle',
        database: 'skillsbattle25',
        password: '12345678abcd?',
        port: '3306',
        host: '127.0.0.1'
    })
    const [rows] = await connection.query(sql, params)

    connection.destroy
    return rows;
}

module.exports = { getAllUsers, insertNewUser, updateUser, deleteUser };