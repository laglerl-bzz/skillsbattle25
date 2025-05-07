const mysql = require('mysql2/promise');

// Create a connection pool instead of individual connections
const pool = mysql.createPool({
    user: 'skillsbattle',
    database: 'labyrinth',
    password: '12345678abcd?',
    port: '3306',
    host: '127.0.0.1',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Execute query helper function using connection pool
async function executeQuery(sql, params = []) {
    try {
        const [rows] = await pool.execute(sql, params);
        return rows;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}

// USER OPERATIONS
async function getAllUsers() {
    return await executeQuery('SELECT * FROM users ORDER BY username');
}

async function insertNewUser(userData) {
    const { username, password } = userData;
    return await executeQuery(
        'INSERT INTO users (username, password, registration_date) VALUES (?, ?, NOW())',
        [username, password]
    );
}

async function updateUser(userId, userData) {
    const { username, password } = userData;
    return await executeQuery(
        'UPDATE users SET username = ?, password = ? WHERE id = ?',
        [username, password, userId]
    );
}

async function deleteUser(userId) {
    return await executeQuery('DELETE FROM users WHERE id = ?', [userId]);
}

async function getUserByUsername(username) {
    const users = await executeQuery(
        'SELECT * FROM users WHERE username = ?',
        [username]
    );
    return users.length > 0 ? users[0] : null;
}

// LABYRINTH OPERATIONS
async function getAllLabyrinths() {
    return await executeQuery(`
        SELECT 
            id, 
            name, 
            size, 
            difficulty, 
            remarks, 
            solution_length AS solutionLength, 
            creator_name AS creatorName, 
            creation_date AS creationDate 
        FROM labyrinths 
        ORDER BY creation_date DESC
    `);
}

async function getLabyrinthById(id) {
    const labyrinths = await executeQuery(`
        SELECT 
            id, 
            name, 
            data, 
            size, 
            difficulty, 
            remarks, 
            solution_length AS solutionLength, 
            creator_name AS creatorName, 
            creation_date AS creationDate 
        FROM labyrinths 
        WHERE id = ?
    `, [id]);

    return labyrinths.length > 0 ? labyrinths[0] : null;
}

async function insertLabyrinth(labyrinth) {
    const { 
        name, 
        data, 
        size, 
        difficulty, 
        remarks, 
        solutionLength, 
        creatorName
    } = labyrinth;

    // Use MySQL's NOW() function instead of passing a JavaScript date
    const result = await executeQuery(
        `INSERT INTO labyrinths (
            name, 
            data, 
            size, 
            difficulty, 
            remarks, 
            solution_length, 
            creator_name, 
            creation_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [name, data, size, difficulty, remarks, solutionLength, creatorName]
    );

    return { id: result.insertId };
}

// Update an existing labyrinth
async function updateLabyrinth(id, labyrinth) {
    const { name, data, size, difficulty, remarks, solutionLength } = labyrinth;

    return await executeQuery(
      `UPDATE labyrinths 
       SET name = ?, data = ?, size = ?, difficulty = ?, remarks = ?, solution_length = ? 
       WHERE id = ?`,
      [name, data, size, difficulty, remarks, solutionLength, id]
    );
  }

async function deleteLabyrinth(id, creatorName) {
    return await executeQuery(
        'DELETE FROM labyrinths WHERE id = ? AND creator_name = ?', 
        [id, creatorName]
    );
}

// STATISTICS OPERATIONS
async function saveUserSolution(solutionData) {
    const { 
        userId, 
        labyrinthId, 
        solutionTime, 
        stepCount, 
        completionDate 
    } = solutionData;

    const result = await executeQuery(
        `INSERT INTO user_solutions (
            user_id, 
            labyrinth_id, 
            solution_time, 
            step_count, 
            completion_date
        ) VALUES (?, ?, ?, ?, ?)`,
        [userId, labyrinthId, solutionTime, stepCount, completionDate]
    );

    return { id: result.insertId };
}

async function getUserSolutions(userId) {
    return await executeQuery(`
        SELECT 
            us.id, 
            us.labyrinth_id AS labyrinthId, 
            l.name AS labyrinthName,
            us.solution_time AS solutionTime, 
            us.step_count AS stepCount, 
            us.completion_date AS completionDate
        FROM user_solutions us
        JOIN labyrinths l ON us.labyrinth_id = l.id
        WHERE us.user_id = ?
        ORDER BY us.completion_date DESC
    `, [userId]);
}

async function getLabyrinthLeaderboard(labyrinthId) {
    return await executeQuery(`
        SELECT 
            us.id,
            u.username,
            us.solution_time AS solutionTime,
            us.step_count AS stepCount,
            us.completion_date AS completionDate
        FROM user_solutions us
        JOIN users u ON us.user_id = u.id
        WHERE us.labyrinth_id = ?
        ORDER BY us.step_count ASC, us.solution_time ASC
        LIMIT 10
    `, [labyrinthId]);
}



module.exports = {
    // User operations
    getAllUsers,
    insertNewUser,
    updateUser,
    deleteUser,
    getUserByUsername,

    // Labyrinth operations
    getAllLabyrinths,
    getLabyrinthById,
    insertLabyrinth,
    updateLabyrinth,
    deleteLabyrinth,

    // Statistics operations
    saveUserSolution,
    getUserSolutions,
    getLabyrinthLeaderboard
};