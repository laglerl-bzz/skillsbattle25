document.addEventListener('DOMContentLoaded', function () {
    // DOM elements
    const mazeTableBody = document.getElementById('mazeTableBody');
    const mazeCanvas = document.getElementById('mazeCanvas');
    const ctx = mazeCanvas.getContext('2d');
    const filterDifficulty = document.getElementById('filterDifficulty');
    const filterSize = document.getElementById('filterSize');
    const applyFiltersBtn = document.getElementById('applyFilters');
    const resetFiltersBtn = document.getElementById('resetFilters');
    const solveButton = document.getElementById('solveButton');
    const resetButton = document.getElementById('resetButton');
    const statusMessage = document.getElementById('statusMessage');

    // Check if filter elements exist to prevent errors
    const filtersExist = filterDifficulty && filterSize && applyFiltersBtn && resetFiltersBtn;

    // Current state
    let allMazes = []; // Store all mazes for frontend filtering
    let filteredMazes = []; // Store currently filtered mazes
    let currentMaze = null;
    let currentPath = [];
    let isPlaying = false;
    let isDrawing = false;
    let startCell = null;
    let endCell = null;
    let cellSize = 20;
    let currentUsername = localStorage.getItem('username') || '';

    // Simple colors
    const colors = {
        wall: '#000000',
        path: '#FFFFFF',
        start: '#00FF00',
        end: '#FF0000',
        player: '#0000FF',
        solution: '#FF00FF'
    };

    // Message collections for different scenarios
    const messages = {
        loading: [
            "Loading mazes...",
            "Gathering maze collection...",
            "Searching for challenges...",
            "Fetching labyrinth data..."
        ],
        filtersApplied: [
            "Filters applied! Here's what we found.",
            "Showing filtered mazes.",
            "Maze search complete!",
            "Found these mazes matching your criteria."
        ],
        filtersReset: [
            "Filters cleared. Showing all mazes.",
            "Reset complete! All mazes visible.",
            "Starting fresh with all mazes.",
            "Filters removed. Full collection displayed."
        ],
        noMazes: [
            "No mazes found matching your criteria.",
            "Your search yielded no results. Try different filters?",
            "We couldn't find any matching mazes.",
            "No mazes available. Maybe create one?"
        ],
        startingMaze: [
            "Ready to play! Draw from start to end.",
            "Challenge begins! Find your path to victory.",
            "Maze loaded! Navigate from green to red.",
            "Your adventure awaits! Start drawing your path."
        ],
        resetMaze: [
            "Maze reset. Try again!",
            "Starting over with a clean slate.",
            "Maze cleared! Ready for a new attempt?",
            "Back to square one. Good luck this time!"
        ],
        noMazeToReset: [
            "No maze to reset. Choose one to play first!",
            "Select a maze before resetting.",
            "Nothing to reset. Find a challenge first!",
            "You need to load a maze before resetting."
        ],
        noMazeToSolve: [
            "No maze loaded to solve.",
            "Choose a maze before using auto-solve.",
            "You need to select a maze first!",
            "Nothing to solve yet. Pick a maze to play."
        ],
        invalidMaze: [
            "Invalid maze: missing start or end position.",
            "This maze appears to be broken. Try another one.",
            "Maze structure is invalid. Select a different one.",
            "Can't play this maze - it's missing critical elements."
        ],
        deletingMaze: [
            "Maze deleted successfully.",
            "Labyrinth removed from collection.",
            "Maze erased successfully.",
            "The maze has been deleted."
        ],
        loginRequired: [
            "You must be logged in to delete mazes.",
            "Authentication required for deletion.",
            "Please log in to remove mazes.",
            "Only logged-in users can delete mazes."
        ],
        solvingMaze: [
            "Finding the optimal path...",
            "Calculating shortest route...",
            "Analyzing maze solution...",
            "Maze-solving algorithm running..."
        ],
        noSolution: [
            "This maze appears to be unsolvable! No valid path found.",
            "No solution exists for this labyrinth.",
            "Even the computer couldn't solve this one!",
            "This maze has no valid path to the exit."
        ],
        genericError: [
            "Something went wrong. Please try again.",
            "An error occurred. Please refresh and retry.",
            "Technical difficulties encountered.",
            "Operation failed. Please try again later."
        ]
    };

    // Initialize the page
    init();

    function init() {
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Load all mazes once
        loadAllMazes();

        // Set up event listeners
        if (filtersExist) {
            applyFiltersBtn.addEventListener('click', applyFilters);
            resetFiltersBtn.addEventListener('click', resetFilters);
            
            // Add input event listeners for real-time filtering
            filterDifficulty.addEventListener('change', applyFilters);
            filterSize.addEventListener('input', function() {
                // Only apply filter if the input is empty or a valid number
                if (this.value === '' || !isNaN(parseInt(this.value))) {
                    applyFilters();
                }
            });
        }

        if (solveButton) {
            solveButton.addEventListener('click', solveMaze);
        }

        if (resetButton) {
            resetButton.addEventListener('click', resetMaze);
        }

        mazeCanvas.addEventListener('mousedown', handleMouseDown);
        mazeCanvas.addEventListener('mousemove', handleMouseMove);
        mazeCanvas.addEventListener('mouseup', handleMouseUp);
        mazeCanvas.addEventListener('touchstart', handleTouchStart);
        mazeCanvas.addEventListener('touchmove', handleTouchMove);
        mazeCanvas.addEventListener('touchend', handleTouchEnd);
        document.addEventListener('keydown', handleKeyDown);
    }

    // Load all mazes once at the beginning
    async function loadAllMazes() {
        try {
            showRandomMessage(messages.loading, true);

            const response = await fetch(`/api/labyrinths`);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} ${errorText}`);
            }

            // Store all mazes in our allMazes array
            allMazes = await response.json();
            
            // Read URL parameters for initial filtering
            const urlParams = new URLSearchParams(window.location.search);
            const difficulty = urlParams.get('difficulty');
            const size = urlParams.get('size');

            // Set form values if filters exist in URL
            if (filtersExist) {
                if (difficulty) filterDifficulty.value = difficulty;
                if (size) filterSize.value = size;
            }

            // Apply any filters from URL
            if (difficulty || size) {
                applyFilters(false); // false means don't show "filters applied" message
            } else {
                // No filters, show all mazes
                filteredMazes = [...allMazes];
                renderMazeTable();
            }

            const loadingMessage = `${allMazes.length} total maze${allMazes.length !== 1 ? 's' : ''} available`;
            showMessage(loadingMessage, true);
            setTimeout(() => {
                if (statusMessage) statusMessage.classList.add('hidden');
            }, 2000);
        } catch (error) {
            console.error("Error loading mazes:", error);
            showMessage(`Error loading mazes: ${error.message}`, false);
        }
    }

    // Apply filters to the already-loaded mazes
    function applyFilters(showMessage = true) {
        if (!filtersExist || allMazes.length === 0) return;

        const difficulty = filterDifficulty.value.trim();
        const size = filterSize.value.trim();

        // Validate size input if provided
        if (size && isNaN(parseInt(size))) {
            showMessage('Size must be a number', false);
            return;
        }

        // Filter mazes based on criteria
        filteredMazes = allMazes.filter(maze => {
            let matchesDifficulty = true;
            let matchesSize = true;

            if (difficulty) {
                matchesDifficulty = maze.difficulty === parseInt(difficulty);
            }

            if (size) {
                // Extract the first number from size string (e.g. "10 x 10" -> 10)
                const mazeSize = parseInt(maze.size);
                matchesSize = !isNaN(mazeSize) && mazeSize === parseInt(size);
            }

            return matchesDifficulty && matchesSize;
        });

        // Update URL with current filters without reloading the page
        updateURLWithFilters({ difficulty, size });
        
        // Render the filtered table
        renderMazeTable();

        // Show appropriate message based on results
        if (showMessage) {
            if (filteredMazes.length === 0) {
                showRandomMessage(messages.noMazes, false);
            } else {
                showRandomMessage(messages.filtersApplied, true);
            }
        }
    }

    // Reset filters function - now just resets UI and shows all mazes
    function resetFilters() {
        if (!filtersExist) return;

        // Clear filter inputs
        filterDifficulty.value = '';
        filterSize.value = '';

        // Clear URL parameters
        window.history.replaceState({}, '', window.location.pathname);

        // Reset to show all mazes
        filteredMazes = [...allMazes];
        renderMazeTable();

        showRandomMessage(messages.filtersReset, true);
    }

    // Update URL with current filters without reloading the page
    function updateURLWithFilters(filters) {
        try {
            const url = new URL(window.location.href);

            // Clear existing search params
            url.search = '';

            // Add new filter params if they exist
            if (filters.difficulty) url.searchParams.set('difficulty', filters.difficulty);
            if (filters.size) url.searchParams.set('size', filters.size);

            // Update URL without reloading page
            window.history.replaceState({}, '', url);
        } catch (error) {
            console.error("Error updating URL:", error);
        }
    }

    // Reset maze function
    function resetMaze() {
        if (!currentMaze || !startCell) {
            showRandomMessage(messages.noMazeToReset, false);
            return;
        }

        // Reset path to just the starting position
        currentPath = [startCell];

        // Reset drawing state
        isDrawing = false;
        isPlaying = true;

        // Redraw the maze
        drawMaze(parseMazeData(currentMaze.data));

        showRandomMessage(messages.resetMaze, true);
    }

    function resizeCanvas() {
        const container = document.getElementById('mazeDisplayContainer');
        if (!container) return; // Safety check

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight || containerWidth;

        mazeCanvas.width = containerWidth - 20;
        mazeCanvas.height = containerHeight - 20;

        if (currentMaze) {
            drawMaze(parseMazeData(currentMaze.data));
        }
    }
    
    function renderMazeTable() {
        if (!mazeTableBody) return; // Safety check

        mazeTableBody.innerHTML = '';

        if (filteredMazes.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="5" style="text-align: center;">No mazes found</td>';
            mazeTableBody.appendChild(row);
            return;
        }

        filteredMazes.forEach(maze => {
            const row = document.createElement('tr');
            const difficultyStars = '★'.repeat(maze.difficulty);
            const createdDate = new Date(maze.creationDate).toLocaleDateString();

            row.innerHTML = `
                <td>${maze.name || 'Unnamed'}</td>
                <td>${maze.size || 'Unknown'}</td>
                <td><span class="difficulty-stars">${difficultyStars}</span></td>
                <td>${createdDate}</td>
                <td>
                    <button class="play-button" data-id="${maze.id}">Play</button>
                    ${maze.creatorName === currentUsername ?
                `<button class="edit-button" data-id="${maze.id}">Edit</button>
                        <button class="delete-button" data-id="${maze.id}">Delete</button>` : ''}
                </td>
            `;

            mazeTableBody.appendChild(row);
        });

        // Add event listeners to buttons
        document.querySelectorAll('.play-button').forEach(button => {
            button.addEventListener('click', () => playMaze(button.dataset.id));
        });

        document.querySelectorAll('.edit-button').forEach(button => {
            button.addEventListener('click', () => editMaze(button.dataset.id));
        });

        document.querySelectorAll('.delete-button').forEach(button => {
            button.addEventListener('click', () => deleteMaze(button.dataset.id));
        });
        
        // Update displayed count
        const countMessage = `${filteredMazes.length} maze${filteredMazes.length !== 1 ? 's' : ''} found`;
        showMessage(countMessage, true);
        setTimeout(() => {
            if (statusMessage) statusMessage.classList.add('hidden');
        }, 2000);
    }

    async function playMaze(mazeId) {
        try {
            showRandomMessage(messages.loading, true);

            const response = await fetch(`/api/labyrinths/${mazeId}`);
            if (!response.ok) throw new Error('Failed to load maze');

            currentMaze = await response.json();
            const parsedMaze = parseMazeData(currentMaze.data);
            const positions = findStartEndPositions(parsedMaze);
            startCell = positions.start;
            endCell = positions.end;

            // Error handling for invalid maze
            if (!startCell || !endCell) {
                showRandomMessage(messages.invalidMaze, false);
                return;
            }

            // Reset game state
            currentPath = [startCell];
            isPlaying = true;
            isDrawing = false;

            // Draw and enable controls
            drawMaze(parsedMaze);
            
            // Clear solution info if displayed
            const solutionInfo = document.getElementById('solutionInfo');
            if (solutionInfo) {
                solutionInfo.classList.add('hidden');
            }
            
            showRandomMessage(messages.startingMaze, true);

            if (solveButton) solveButton.disabled = false;
            if (resetButton) resetButton.disabled = false;
        } catch (error) {
            console.error("Error playing maze:", error);
            showMessage(`Error: ${error.message}`, false);
        }
    }

    function parseMazeData(mazeData) {
        if (!mazeData) return [['#']]; // Return minimal maze if data is missing

        const trimmedText = mazeData.replace(/\n+$/, '');
        const lines = trimmedText.split('\n');
        const maxLength = Math.max(...lines.map(line => line.length), 1);

        return lines.map(line => {
            const paddedLine = line.padEnd(maxLength, ' ');
            return paddedLine.split('');
        });
    }

    function findStartEndPositions(maze) {
        let start = null;
        let end = null;

        for (let y = 0; y < maze.length; y++) {
            for (let x = 0; x < maze[y].length; x++) {
                if (maze[y][x] === 'S') {
                    start = { x, y };
                } else if (maze[y][x] === 'E') {
                    end = { x, y };
                }
            }
        }

        if (!start || !end) {
            const paths = findAccessiblePaths(maze);
            if (paths.length >= 2) {
                start = paths[0];
                end = paths[paths.length - 1];
            }
        }

        return { start, end };
    }

    function findAccessiblePaths(maze) {
        const paths = [];

        for (let y = 1; y < maze.length - 1; y += 2) {
            if (y % 2 === 0) continue;

            const row = maze[y];
            for (let x = 1; x < row.length - 1; x += 2) {
                if ((row[x] === ' ' || row[x] === 'S' || row[x] === 'E')) {
                    paths.push({ x, y });
                }
            }
        }
        return paths;
    }

    function drawMaze(maze) {
        // Make sure we have a maze to draw
        if (!maze || maze.length === 0) return;

        // Calculate cell size
        const width = Math.max(...maze.map(row => row.length));
        const height = maze.length;
        cellSize = Math.min(
            Math.floor(mazeCanvas.width / width),
            Math.floor(mazeCanvas.height / height)
        );

        // Ensure cell size is at least 1
        cellSize = Math.max(cellSize, 1);

        // Clear canvas
        ctx.clearRect(0, 0, mazeCanvas.width, mazeCanvas.height);
        ctx.fillStyle = colors.path;
        ctx.fillRect(0, 0, mazeCanvas.width, mazeCanvas.height);

        // Draw maze elements
        for (let y = 0; y < maze.length; y++) {
            for (let x = 0; x < maze[y].length; x++) {
                const cell = maze[y][x];
                if (cell === '#') {
                    ctx.fillStyle = colors.wall;
                    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                } else if (cell === 'S') {
                    ctx.fillStyle = colors.start;
                    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                } else if (cell === 'E') {
                    ctx.fillStyle = colors.end;
                    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                }
            }
        }

        // Draw current path if playing
        if (isPlaying && currentPath.length > 0) {
            // Draw line
            ctx.strokeStyle = colors.player;
            ctx.lineWidth = cellSize / 3;
            ctx.beginPath();
            ctx.moveTo(
                currentPath[0].x * cellSize + cellSize / 2,
                currentPath[0].y * cellSize + cellSize / 2
            );

            for (let i = 1; i < currentPath.length; i++) {
                ctx.lineTo(
                    currentPath[i].x * cellSize + cellSize / 2,
                    currentPath[i].y * cellSize + cellSize / 2
                );
            }
            ctx.stroke();
        }
    }

    // Touch events support
    function handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        handleMouseDown(mouseEvent);
    }

    function handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        handleMouseMove(mouseEvent);
    }

    function handleTouchEnd(e) {
        e.preventDefault();
        handleMouseUp();
    }

    function handleMouseDown(e) {
        if (!isPlaying || !startCell) return;

        const rect = mazeCanvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / cellSize);
        const y = Math.floor((e.clientY - rect.top) / cellSize);

        if (x === startCell.x && y === startCell.y) {
            isDrawing = true;
            currentPath = [{ x, y }];
            drawMaze(parseMazeData(currentMaze.data));
        }
    }

    function handleMouseMove(e) {
        if (!isDrawing) return;

        const rect = mazeCanvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / cellSize);
        const y = Math.floor((e.clientY - rect.top) / cellSize);

        const lastPos = currentPath[currentPath.length - 1];
        if (x === lastPos.x && y === lastPos.y) return;

        const maze = parseMazeData(currentMaze.data);
        if (x < 0 || x >= maze[0].length || y < 0 || y >= maze.length || maze[y][x] === '#') {
            isDrawing = false;
            const failMessages = [
                "Oops! You hit a wall. Maze failed!",
                "CRASH! Your path ended at a wall.",
                "Dead end! Your journey has been halted by a wall.",
                "Maze challenge failed! You collided with a wall."
            ];
            showRandomMessage(failMessages, false);
            return;
        }

        currentPath.push({ x, y });

        if (x === endCell.x && y === endCell.y) {
            isDrawing = false;
            const stepCount = currentPath.length - 1;
            const successMessages = [
                `Amazing! You solved the maze in ${stepCount} steps!`,
                `Brilliant navigation! Maze completed in ${stepCount} steps.`,
                `Victory! You found the exit in ${stepCount} steps.`,
                `Maze mastered in ${stepCount} steps! Well done!`
            ];
            
            // Show solution length info
            const solutionInfo = document.getElementById('solutionInfo');
            const solutionLength = document.getElementById('solutionLength');
            if (solutionInfo && solutionLength) {
                solutionLength.textContent = stepCount;
                solutionInfo.classList.remove('hidden');
            }
            
            showRandomMessage(successMessages, true);
        }

        drawMaze(maze);
    }

    function handleMouseUp() {
        isDrawing = false;
    }

    function handleKeyDown(e) {
        if (!isPlaying || !isDrawing) return;

        const lastPos = currentPath[currentPath.length - 1];
        let newX = lastPos.x;
        let newY = lastPos.y;
        let moved = false;

        switch (e.key) {
            case 'ArrowUp':
                newY -= 1;
                moved = true;
                break;
            case 'ArrowRight':
                newX += 1;
                moved = true;
                break;
            case 'ArrowDown':
                newY += 1;
                moved = true;
                break;
            case 'ArrowLeft':
                newX -= 1;
                moved = true;
                break;
            default:
                return;
        }

        if (moved) {
            const maze = parseMazeData(currentMaze.data);
            if (newX < 0 || newX >= maze[0].length || newY < 0 || newY >= maze.length || maze[newY][newX] === '#') {
                isDrawing = false;
                const failMessages = [
                    "Oops! You hit a wall. Maze failed!",
                    "CRASH! Your path ended at a wall.",
                    "Dead end! Your journey has been halted by a wall.",
                    "Maze challenge failed! You collided with a wall."
                ];
                showRandomMessage(failMessages, false);
                return;
            }

            currentPath.push({ x: newX, y: newY });

            if (newX === endCell.x && newY === endCell.y) {
                isDrawing = false;
                const stepCount = currentPath.length - 1;
                const successMessages = [
                    `Amazing! You solved the maze in ${stepCount} steps!`,
                    `Brilliant navigation! Maze completed in ${stepCount} steps.`,
                    `Victory! You found the exit in ${stepCount} steps.`,
                    `Maze mastered in ${stepCount} steps! Well done!`
                ];
                
                // Show solution length info
                const solutionInfo = document.getElementById('solutionInfo');
                const solutionLength = document.getElementById('solutionLength');
                if (solutionInfo && solutionLength) {
                    solutionLength.textContent = stepCount;
                    solutionInfo.classList.remove('hidden');
                }
                
                showRandomMessage(successMessages, true);
            }

            drawMaze(maze);
        }
    }

    async function solveMaze() {
        if (!currentMaze) {
            showRandomMessage(messages.noMazeToSolve, false);
            return;
        }

        try {
            showRandomMessage(messages.solvingMaze, true);

            const maze = parseMazeData(currentMaze.data);
            const solution = autoSolveMaze(maze, startCell, endCell);

            if (solution.solvable) {
                // Display the solution directly
                currentPath = solution.path;
                drawMaze(maze);

                // Draw solution path
                ctx.strokeStyle = colors.solution;
                ctx.lineWidth = cellSize / 3;
                ctx.beginPath();
                ctx.moveTo(
                    solution.path[0].x * cellSize + cellSize / 2,
                    solution.path[0].y * cellSize + cellSize / 2
                );

                for (let i = 1; i < solution.path.length; i++) {
                    ctx.lineTo(
                        solution.path[i].x * cellSize + cellSize / 2,
                        solution.path[i].y * cellSize + cellSize / 2
                    );
                }
                ctx.stroke();

                // Highlight start and end points
                ctx.fillStyle = colors.start;
                ctx.beginPath();
                ctx.arc(
                    solution.path[0].x * cellSize + cellSize / 2,
                    solution.path[0].y * cellSize + cellSize / 2,
                    cellSize / 4, 0, 2 * Math.PI
                );
                ctx.fill();

                ctx.fillStyle = colors.end;
                ctx.beginPath();
                ctx.arc(
                    solution.path[solution.path.length - 1].x * cellSize + cellSize / 2,
                    solution.path[solution.path.length - 1].y * cellSize + cellSize / 2,
                    cellSize / 4, 0, 2 * Math.PI
                );
                ctx.fill();

                // Calculate solution length
                const stepCount = solution.path.length - 1;
                
                // Store solution length in the maze object like in upload.js
                currentMaze.solutionLength = stepCount;
                
                const autoSolveMessages = [
                    `Auto-solved! The optimal path is ${stepCount} steps.`,
                    `Solution revealed! Shortest path: ${stepCount} steps.`,
                    `Computer navigator found the way in ${stepCount} steps!`,
                    `Maze automatically solved with ${stepCount} perfect moves.`
                ];
                
                // Show solution length info
                const solutionInfo = document.getElementById('solutionInfo');
                const solutionLength = document.getElementById('solutionLength');
                if (solutionInfo && solutionLength) {
                    solutionLength.textContent = stepCount;
                    solutionInfo.classList.remove('hidden');
                }
                
                // Display a more prominent message similar to upload.js
                const prominentMessage = `"${currentMaze.name}" has been solved! The solution length is ${stepCount} steps.`;
                showMessage(prominentMessage, true);
                
                // After a brief delay, show one of the random messages
                setTimeout(() => {
                    showRandomMessage(autoSolveMessages, true);
                }, 3000);
            } else {
                showRandomMessage(messages.noSolution, false);
            }
        } catch (error) {
            console.error("Error solving maze:", error);
            showMessage(`Error during auto-solve: ${error.message}`, false);
        }
    }

    function autoSolveMaze(maze, start, end) {
        if (!start || !end) return { solvable: false, path: [] };

        // Create a matrix to track visited cells
        const visited = Array(maze.length).fill().map(() =>
            Array(Math.max(...maze.map(row => row.length))).fill(false)
        );

        // Create a matrix to track parents for reconstructing the path
        const parent = Array(maze.length).fill().map(() =>
            Array(Math.max(...maze.map(row => row.length))).fill(null)
        );

        // Use breadth-first search for optimal path
        const queue = [];
        queue.push(start);
        visited[start.y][start.x] = true;

        // Directions: up, right, down, left
        const dx = [0, 1, 0, -1];
        const dy = [-1, 0, 1, 0];

        let found = false;

        while (queue.length > 0 && !found) {
            const current = queue.shift();

            // Check if we reached the end
            if (current.x === end.x && current.y === end.y) {
                found = true;
                break;
            }

            // Try all four directions
            for (let i = 0; i < 4; i++) {
                const newX = current.x + dx[i];
                const newY = current.y + dy[i];

                // Check if valid move
                if (newY >= 0 && newY < maze.length &&
                    newX >= 0 && newX < maze[newY].length &&
                    maze[newY][newX] !== '#' && !visited[newY][newX]) {

                    queue.push({x: newX, y: newY});
                    visited[newY][newX] = true;
                    parent[newY][newX] = current;
                }
            }
        }

        // Reconstruct path if solution found
        const path = [];
        if (found) {
            let current = end;
            path.unshift(current);

            while (current.x !== start.x || current.y !== start.y) {
                current = parent[current.y][current.x];
                path.unshift(current);
            }
        }

        return {
            solvable: found,
            path: path
        };
    }

    async function editMaze(mazeId) {
        window.location.href = `edit.html?id=${mazeId}`;
    }

    async function deleteMaze(mazeId) {
        if (!currentUsername) {
            showRandomMessage(messages.loginRequired, false);
            return;
        }
    
        if (confirm('Are you sure you want to delete this maze?')) {
            try {
                showMessage('Deleting maze...', true);
                
                const response = await fetch(`/api/labyrinths/${mazeId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ creatorName: currentUsername })
                });
    
                if (response.ok) {
                    showRandomMessage(messages.deletingMaze, true);
                    
                    // Reload all mazes from server instead of just filtering arrays
                    try {
                        const refreshResponse = await fetch(`/api/labyrinths`);
                        if (refreshResponse.ok) {
                            // Update both arrays with fresh data
                            allMazes = await refreshResponse.json();
                            
                            // Reapply any current filters
                            if (filtersExist) {
                                const difficulty = filterDifficulty.value.trim();
                                const size = filterSize.value.trim();
                                
                                if (difficulty || size) {
                                    // Use existing filter function with the fresh data
                                    applyFilters(false); // Don't show filter message
                                } else {
                                    // No filters, show all mazes
                                    filteredMazes = [...allMazes];
                                    renderMazeTable();
                                }
                            } else {
                                // No filters, simply update and render
                                filteredMazes = [...allMazes];
                                renderMazeTable();
                            }
                            
                            // Show updated count
                            const countMessage = `${filteredMazes.length} maze${filteredMazes.length !== 1 ? 's' : ''} found`;
                            showMessage(countMessage, true);
                        }
                    } catch (refreshError) {
                        console.error("Error refreshing maze list:", refreshError);
                        // Fallback to the array filtering approach if refresh fails
                        allMazes = allMazes.filter(maze => maze.id !== mazeId);
                        filteredMazes = filteredMazes.filter(maze => maze.id !== mazeId);
                        renderMazeTable();
                    }
                } else {
                    const error = await response.json();
                    showMessage(error.message || 'Failed to delete maze', false);
                }
            } catch (error) {
                console.error("Error deleting maze:", error);
                showMessage(`Error: ${error.message}`, false);
            }
        }
    }

    // Helper function to show a random message from a message array
    function showRandomMessage(messageArray, isSuccess) {
        if (!statusMessage || !messageArray || messageArray.length === 0) return;
        
        const randomIndex = Math.floor(Math.random() * messageArray.length);
        showMessage(messageArray[randomIndex], isSuccess);
    }

    function showMessage(message, isSuccess) {
        if (!statusMessage) return; // Safety check

        statusMessage.textContent = message;
        statusMessage.className = isSuccess ? 'result-message success' : 'result-message error';
        statusMessage.classList.remove('hidden');

        if (isSuccess && !message.includes('solved') && !message.includes('maze in') && !message.includes('Loading')) {
            setTimeout(() => {
                statusMessage.classList.add('hidden');
            }, 3000);
        }
    }
});