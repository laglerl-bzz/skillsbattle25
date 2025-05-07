document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const fileInput = document.getElementById('labFile');
    const fileStatus = document.getElementById('fileStatus');
    const sizeWidth = document.getElementById('sizeWidth');
    const sizeHeight = document.getElementById('sizeHeight');
    const stars = document.querySelectorAll('.star');
    const difficultyInput = document.getElementById('difficulty');
    const saveButton = document.getElementById('saveButton');
    const resultMessage = document.getElementById('resultMessage');

    // State variables
    let rawLabyrinthData = null;
    let parsedMaze = null;
    let username = localStorage.getItem('username') || 'Unknown';

    // Initialize event listeners
    initEventListeners();

    function initEventListeners() {
        // File selection handler
        fileInput.addEventListener('change', handleFileSelection);

        // Star rating handler
        stars.forEach(star => {
            star.addEventListener('click', function() {
                const value = parseInt(this.dataset.value);
                difficultyInput.value = value;
                updateStarRating(value);
            });
        });

        // Save button handler
        saveButton.addEventListener('click', handleSave);
    }

    // Handle file selection
    async function handleFileSelection(e) {
        const file = e.target.files[0];
        if (!file) {
            fileStatus.textContent = 'No file';
            rawLabyrinthData = null;
            parsedMaze = null;
            return;
        }

        fileStatus.textContent = file.name;

        try {
            // Read file content
            const content = await readFileAsText(file);
            rawLabyrinthData = content;

            // Parse the maze
            parsedMaze = parseMazeContent(content);

            // Auto-detect maze dimensions
            const dimensions = detectMazeDimensions(parsedMaze);

            // Update size inputs
            sizeWidth.value = dimensions.width;
            sizeHeight.value = dimensions.height;
        } catch (error) {
            showResult(`Error reading file: ${error.message}`, false);
            rawLabyrinthData = null;
            parsedMaze = null;
        }
    }

    // Read file as text
    function readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    // Parse maze content into a 2D grid
    function parseMazeContent(content) {
        // Remove trailing whitespace but preserve leading spaces
        const trimmedContent = content.replace(/\s+$/, '');

        // Split into lines
        const lines = trimmedContent.split('\n');

        // Find the maximum line length
        const maxLength = Math.max(...lines.map(line => line.length));

        // Create a 2D grid with consistent width
        const maze = lines.map(line => {
            // Pad shorter lines with spaces
            const paddedLine = line.padEnd(maxLength, ' ');
            return paddedLine.split('');
        });
        
        // Remove every 3rd column to eliminate double spaces in paths
        return removeEveryThirdColumn(maze);
    }
    
    // Function to remove every 3rd column from the maze
    function removeEveryThirdColumn(maze) {
        if (!maze || maze.length === 0) return maze;
        
        const transformedMaze = [];
        
        for (let y = 0; y < maze.length; y++) {
            const newRow = [];
            for (let x = 0; x < maze[y].length; x++) {
                // Skip every 3rd column (0-based, so columns 2, 5, 8, etc.)
                if (x % 3 !== 2) {
                    newRow.push(maze[y][x]);
                }
            }
            transformedMaze.push(newRow);
        }
        
        return transformedMaze;
    }

    // Detect maze dimensions based on the parsed maze
    function detectMazeDimensions(maze) {
        if (!maze || maze.length === 0) {
            return { width: 10, height: 10 }; // Default values
        }

        // Count rows and columns
        const rows = maze.length;
        const cols = maze[0].length;

        // Calculate actual maze dimensions 
        // Adjust calculation for new column structure (2 chars per cell instead of 3)
        const width = Math.max(1, Math.floor((cols - 2) / 2));
        const height = Math.max(1, Math.floor((rows - 1) / 2));

        return { width, height };
    }

    // Update star rating display
    function updateStarRating(value) {
        stars.forEach(star => {
            const starValue = parseInt(star.dataset.value);
            if (starValue <= value) {
                star.textContent = '★';
                star.classList.add('filled');
            } else {
                star.textContent = '☆';
                star.classList.remove('filled');
            }
        });
    }

    // Handle save button click
    async function handleSave() {
        // Validate inputs
        if (!validateInputs()) {
            return;
        }

        try {
            // Find entrance and exit positions
            const { entrancePos, exitPos } = findEntranceAndExit(parsedMaze);

            if (!entrancePos || !exitPos) {
                showResult('Could not identify valid entrance and exit positions in the maze', false);
                return;
            }

            // Mark entrance and exit in the maze
            const markedMaze = markEntranceAndExit(parsedMaze, entrancePos, exitPos);

            // Solve the maze using the unified BFS approach
            const solution = solveMaze(markedMaze, entrancePos, exitPos);

            if (!solution.solvable) {
                showResult('This labyrinth has no valid solution. Please check the maze structure.', false);
                return;
            }

            // Prepare data for saving
            const mazeData = prepareMazeData(markedMaze, solution);

            // Save to server
            await saveMazeToServer(mazeData);

            // Show success message
            showResult(`Labyrinth "${mazeData.name}" successfully uploaded! The solution length is ${mazeData.solutionLength} steps.`, true);
        } catch (error) {
            console.error('Error during save:', error);
            showResult(`Error saving maze: ${error.message}`, false);
        }
    }

    // Find entrance and exit positions in the maze
    function findEntranceAndExit(maze) {
        // Find all accessible path positions (spaces)
        const pathPositions = [];

        // We only check odd-indexed rows (0-based) which contain paths
        // And we skip the first and last rows which are just walls
        for (let y = 1; y < maze.length - 1; y += 2) {
            // Skip cells that are wall rows
            if (y % 2 === 0) continue;

            const row = maze[y];
            // Check each potential path position (every 2 characters after removing 3rd column)
            for (let x = 1; x < row.length - 1; x += 2) {
                // Check if we have a valid path (space)
                if (row[x] === ' ') {
                    pathPositions.push({ x, y });
                }
            }
        }

        // If we have at least two path positions, use the first and last as entrance and exit
        if (pathPositions.length >= 2) {
            return {
                entrancePos: pathPositions[0],
                exitPos: pathPositions[pathPositions.length - 1]
            };
        }

        // If we don't have enough path positions, return null
        return { entrancePos: null, exitPos: null };
    }

    // Mark entrance and exit in the maze
    function markEntranceAndExit(maze, entrance, exit) {
        // Create a deep copy of the maze
        const markedMaze = maze.map(row => [...row]);

        // Mark entrance with 'S'
        markedMaze[entrance.y][entrance.x] = 'S';

        // Mark exit with 'E'
        markedMaze[exit.y][exit.x] = 'E';

        return markedMaze;
    }

    /**
     * Unified solution to solve maze using BFS
     * Works consistently for both upload.js and play.js
     * 
     * @param {Array<Array<string>>} maze 2D array representing maze
     * @param {Object} start Starting position {x, y}
     * @param {Object} end Ending position {x, y}
     * @returns {Object} Solution information
     */
    function solveMaze(maze, start, end) {
        // Check for valid inputs
        if (!start || !end || !maze || !maze.length) {
            return { solvable: false, path: [] };
        }

        // Create matrix to track visited cells
        const height = maze.length;
        const width = Math.max(...maze.map(row => row.length));
        const visited = Array(height).fill().map(() => Array(width).fill(false));
        
        // Create a distance matrix to track minimum steps to each cell
        const distance = Array(height).fill().map(() => Array(width).fill(Infinity));
        
        // Create matrix to track parent cells for path reconstruction
        const parent = Array(height).fill().map(() => Array(width).fill(null));
        
        // Initialize BFS queue with start position
        const queue = [];
        queue.push(start);
        visited[start.y][start.x] = true;
        distance[start.y][start.x] = 0;
        
        // Check if we're using the maze format with step size 2 
        // (as in upload.js after column removal)
        const isStep2Format = checkForStep2Format(maze);
        
        // Set direction vectors based on maze format
        const directions = isStep2Format ? 
            // For upload.js format (step size 2)
            [
                { dx: 2, dy: 0 },   // Right
                { dx: 0, dy: 2 },   // Down
                { dx: -2, dy: 0 },  // Left
                { dx: 0, dy: -2 }   // Up
            ] : 
            // For play.js format (step size 1)
            [
                { dx: 1, dy: 0 },   // Right
                { dx: 0, dy: 1 },   // Down
                { dx: -1, dy: 0 },  // Left
                { dx: 0, dy: -1 }   // Up
            ];
        
        let found = false;
        
        // BFS main loop
        while (queue.length > 0 && !found) {
            const current = queue.shift();
            
            // Check if we've reached the destination
            if (current.x === end.x && current.y === end.y) {
                found = true;
                break;
            }
            
            // Try all possible directions
            for (const dir of directions) {
                const nx = current.x + dir.dx;
                const ny = current.y + dir.dy;
                
                // Check if move is valid based on maze format
                if (isValidMove(maze, current, {x: nx, y: ny}, visited, isStep2Format)) {
                    visited[ny][nx] = true;
                    parent[ny][nx] = current;
                    distance[ny][nx] = distance[current.y][current.x] + 1;
                    queue.push({x: nx, y: ny});
                }
            }
        }
        
        // If solution found, reconstruct the path
        if (found) {
            const path = reconstructPath(parent, start, end);
            return {
                solvable: true,
                path: path,
                // The solution length is the number of steps, not cells
                length: path.length - 1
            };
        }
        
        return { solvable: false, path: [], length: 0 };
    }

    /**
     * Check if the maze uses step size 2 format (as in upload.js)
     */
    function checkForStep2Format(maze) {
        // Check for pattern of walls and paths that would indicate a step-2 format
        // This is a heuristic, but should work for standard mazes
        
        // Count odd-position paths and even-position walls
        let oddPathCount = 0;
        let evenWallCount = 0;
        let totalChecked = 0;
        
        // Sample the maze to determine format
        for (let y = 1; y < Math.min(maze.length, 5); y++) {
            for (let x = 1; x < Math.min(maze[y].length, 5); x++) {
                totalChecked++;
                if ((x % 2 === 1) && (y % 2 === 1) && maze[y][x] !== '#') {
                    oddPathCount++;
                }
                if ((x % 2 === 0) && (y % 2 === 0) && maze[y][x] === '#') {
                    evenWallCount++;
                }
            }
        }
        
        // If more than 70% of odd positions are paths, likely step-2 format
        return (oddPathCount / totalChecked > 0.3);
    }

    /**
     * Checks if a move is valid based on maze format
     */
    function isValidMove(maze, from, to, visited, isStep2Format) {
        const { x: toX, y: toY } = to;
        const { x: fromX, y: fromY } = from;
        
        // Check bounds
        if (toY < 0 || toY >= maze.length || toX < 0 || toX >= maze[0].length) {
            return false;
        }
        
        // Check if destination is wall or already visited
        if (maze[toY][toX] === '#' || visited[toY][toX]) {
            return false;
        }
        
        if (isStep2Format) {
            // For step-2 format, check the cell in between (for walls)
            const dx = Math.abs(toX - fromX);
            const dy = Math.abs(toY - fromY);
            
            if ((dx === 2 && dy === 0) || (dx === 0 && dy === 2)) {
                const midX = Math.min(toX, fromX) + Math.floor(dx / 2);
                const midY = Math.min(toY, fromY) + Math.floor(dy / 2);
                
                // If there's a wall between cells, move is invalid
                if (maze[midY][midX] === '#') {
                    return false;
                }
                return true;
            }
            return false; // Invalid step size
        }
        
        // For step-1 format, just check that we're moving only one cell
        const dx = Math.abs(toX - fromX);
        const dy = Math.abs(toY - fromY);
        return (dx + dy === 1); // Only allow moving one cell at a time
    }

    /**
     * Reconstructs the path from start to end using parent pointers
     */
    function reconstructPath(parent, start, end) {
        const path = [];
        let current = end;
        
        // Start from end and work backwards
        while (current) {
            path.unshift(current);
            if (current.x === start.x && current.y === start.y) {
                break;
            }
            current = parent[current.y][current.x];
        }
        
        return path;
    }

    /**
     * Legacy implementation kept for reference
     * @deprecated Use solveMaze instead
     */
    function solveMazeWithBFS(maze, start, end) {
        // Queue for BFS
        const queue = [{ x: start.x, y: start.y, path: [{ x: start.x, y: start.y }] }];

        // Set to track visited cells
        const visited = new Set();
        visited.add(`${start.x},${start.y}`);

        // Directions to move (right, down, left, up) with specific step sizes
        // Adjusted for new column structure (2 chars per cell instead of 3)
        const directions = [
            { dx: 2, dy: 0 },  // Right (2 steps instead of 3)
            { dx: 0, dy: 2 },  // Down (2 steps)
            { dx: -2, dy: 0 }, // Left (2 steps instead of 3)
            { dx: 0, dy: -2 }  // Up (2 steps)
        ];

        // BFS loop
        while (queue.length > 0) {
            const { x, y, path } = queue.shift();

            // Check if we reached the end
            if (x === end.x && y === end.y) {
                return { solvable: true, path: path };
            }

            // Try all four directions
            for (const dir of directions) {
                const nx = x + dir.dx;
                const ny = y + dir.dy;

                // Check if the new position is valid
                if (isValidOldMove(maze, x, y, nx, ny, visited)) {
                    // Mark as visited
                    visited.add(`${nx},${ny}`);

                    // Add to queue with updated path
                    const newPath = [...path, { x: nx, y: ny }];
                    queue.push({ x: nx, y: ny, path: newPath });
                }
            }
        }

        // No solution found
        return { solvable: false, path: [] };
    }

    /**
     * Legacy validation check kept for reference
     * @deprecated Use isValidMove instead
     */
    function isValidOldMove(maze, fromX, fromY, toX, toY, visited) {
        // Check if destination is out of bounds
        if (toY < 0 || toY >= maze.length || toX < 0 || toX >= maze[toY].length) {
            return false;
        }

        // Check if destination is a wall
        if (maze[toY][toX] === '#') {
            return false;
        }

        // Check if already visited
        if (visited.has(`${toX},${toY}`)) {
            return false;
        }

        // Check if move is valid (2 steps horizontally or 2 steps vertically)
        const dx = Math.abs(toX - fromX);
        const dy = Math.abs(toY - fromY);

        if ((dx === 2 && dy === 0) || (dx === 0 && dy === 2)) {
            // Check for walls in between
            if (dx === 2) { // Horizontal movement
                const minX = Math.min(toX, fromX);
                if (maze[fromY][minX + 1] === '#') {
                    return false; // Wall in between
                }
                return true;
            } else if (dy === 2) { // Vertical movement
                const minY = Math.min(toY, fromY);
                if (maze[minY + 1][fromX] === '#') {
                    return false; // Wall in between
                }
                return true;
            }
        }

        return false;
    }

    // Validate all inputs before saving
    function validateInputs() {
        const name = document.getElementById('labName').value;
        const difficulty = parseInt(difficultyInput.value);

        if (!name) {
            showResult('Please enter a name for the labyrinth', false);
            return false;
        }

        if (!rawLabyrinthData) {
            showResult('Please select a file', false);
            return false;
        }

        if (difficulty === 0) {
            showResult('Please select a difficulty rating', false);
            return false;
        }

        if (!parsedMaze) {
            showResult('Maze could not be parsed properly', false);
            return false;
        }

        return true;
    }

    // Prepare maze data for saving
    function prepareMazeData(markedMaze, solution) {
        const name = document.getElementById('labName').value;
        const width = parseInt(sizeWidth.value);
        const height = parseInt(sizeHeight.value);
        const difficulty = parseInt(difficultyInput.value);
        const remarks = document.getElementById('remarks').value;

        // Convert maze back to string
        const mazeString = markedMaze.map(row => row.join('')).join('\n');

        return {
            name: name,
            data: mazeString,
            size: `${width} x ${height}`,
            difficulty: difficulty,
            remarks: remarks || '',
            solutionLength: solution.length || solution.path.length - 1, // Use new length property if available
            creatorName: username
        };
    }

    // Save maze data to server
    async function saveMazeToServer(mazeData) {
        const response = await fetch('/api/labyrinths', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(mazeData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to save labyrinth');
        }

        return await response.json();
    }

    // Show result message
    function showResult(message, isSuccess) {
        resultMessage.textContent = message;
        resultMessage.className = isSuccess ? 'result-message success' : 'result-message error';
        resultMessage.classList.remove('hidden');

        // Scroll to message
        setTimeout(() => {
            resultMessage.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }
});

// Helper functions for size input controls
function incrementValue(id) {
    const input = document.getElementById(id);
    const max = parseInt(input.getAttribute('max'));
    let value = parseInt(input.value);
    value = isNaN(value) ? 1 : value + 1;
    input.value = value > max ? max : value;
}

function decrementValue(id) {
    const input = document.getElementById(id);
    const min = parseInt(input.getAttribute('min'));
    let value = parseInt(input.value);
    value = isNaN(value) ? 0 : value - 1;
    input.value = value < min ? min : value;
}