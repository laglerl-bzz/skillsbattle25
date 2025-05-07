/**
 * Maze Game - Play Module
 * Handles maze display, gameplay, and solving functionality
 */
document.addEventListener('DOMContentLoaded', function () {
    // Module structure
    const MazeGame = {
        elements: {},        // DOM elements
        state: {},           // Game state
        config: {},          // Configuration
        messages: {},        // User feedback messages
        init: null,          // Initialization function
        api: {},             // API calls
        rendering: {},       // UI rendering functions
        gameplay: {},        // Game mechanics 
        pathfinding: {},     // Maze solving algorithms
        events: {},          // Event handlers
        utils: {}            // Helper utilities
    };

    // DOM elements
    MazeGame.elements = {
        mazeTableBody: document.getElementById('mazeTableBody'),
        mazeCanvas: document.getElementById('mazeCanvas'),
        ctx: document.getElementById('mazeCanvas').getContext('2d'),
        filterDifficulty: document.getElementById('filterDifficulty'),
        filterSize: document.getElementById('filterSize'),
        resetFiltersBtn: document.getElementById('resetFilters'),
        solveButton: document.getElementById('solveButton'),
        resetButton: document.getElementById('resetButton'),
        statusMessage: document.getElementById('statusMessage'),
        solutionInfo: document.getElementById('solutionInfo'),
        solutionLength: document.getElementById('solutionLength')
    };

    // Configuration
    MazeGame.config = {
        colors: {
            wall: '#000000',
            path: '#FFFFFF',
            start: '#00FF00',
            end: '#FF0000',
            player: '#0000FF',
            solution: '#FF00FF'
        },
        cellSize: 20,
        messageDisplayTime: 3000, // milliseconds
        filtersExist: Boolean(
            MazeGame.elements.filterDifficulty && 
            MazeGame.elements.filterSize && 
            MazeGame.elements.resetFiltersBtn
        )
    };

    // Game state
    MazeGame.state = {
        allMazes: [],
        filteredMazes: [],
        currentMaze: null,
        currentPath: [],
        isPlaying: false,
        isDrawing: false,
        startCell: null,
        endCell: null,
        cellSize: MazeGame.config.cellSize,
        currentUsername: localStorage.getItem('username') || ''
    };

    // User feedback messages
    MazeGame.messages = {
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
        mazeFailure: [
            "Oops! You hit a wall. Maze failed!",
            "CRASH! Your path ended at a wall.",
            "Dead end! Your journey has been halted by a wall.",
            "Maze challenge failed! You collided with a wall."
        ],
        mazeSuccess: [
            "Amazing! You solved the maze in {steps} steps!",
            "Brilliant navigation! Maze completed in {steps} steps.",
            "Victory! You found the exit in {steps} steps.",
            "Maze mastered in {steps} steps! Well done!"
        ],
        autoSolveSuccess: [
            "Auto-solved! The optimal path is {steps} steps.",
            "Solution revealed! Shortest path: {steps} steps.",
            "Computer navigator found the way in {steps} steps!",
            "Maze automatically solved with {steps} perfect moves."
        ],
        genericError: [
            "Something went wrong. Please try again.",
            "An error occurred. Please refresh and retry.",
            "Technical difficulties encountered.",
            "Operation failed. Please try again later."
        ]
    };

    // API calls
    MazeGame.api = {
        /**
         * Fetches all mazes from the server
         * @returns {Promise<Array>} Array of maze objects
         */
        async getAllMazes() {
            const response = await fetch('/api/labyrinths');
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error: ${response.status} ${errorText}`);
            }
            return await response.json();
        },

        /**
         * Fetches a specific maze by ID
         * @param {string} mazeId The maze identifier
         * @returns {Promise<Object>} The maze object
         */
        async getMazeById(mazeId) {
            const response = await fetch(`/api/labyrinths/${mazeId}`);
            if (!response.ok) {
                throw new Error('Failed to load maze');
            }
            return await response.json();
        },

        /**
         * Deletes a maze from the server
         * @param {string} mazeId The maze identifier
         * @param {string} creatorName The username of the creator
         * @returns {Promise<boolean>} Success indicator
         */
        async deleteMaze(mazeId, creatorName) {
            const response = await fetch(`/api/labyrinths/${mazeId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ creatorName })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to delete maze');
            }
            
            return true;
        }
    };

    // Rendering functions
    MazeGame.rendering = {
        /**
         * Resizes the canvas to fit container
         */
        resizeCanvas() {
            const container = document.getElementById('mazeDisplayContainer');
            if (!container) return;
    
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight || containerWidth;
    
            MazeGame.elements.mazeCanvas.width = containerWidth - 20;
            MazeGame.elements.mazeCanvas.height = containerHeight - 20;
    
            if (MazeGame.state.currentMaze) {
                const parsedMaze = MazeGame.gameplay.parseMazeData(MazeGame.state.currentMaze.data);
                MazeGame.rendering.drawMaze(parsedMaze);
            }
        },

        /**
         * Renders the maze table with filtered mazes
         */
        renderMazeTable() {
            const { mazeTableBody } = MazeGame.elements;
            const { filteredMazes, currentUsername } = MazeGame.state;
            
            if (!mazeTableBody) return;
    
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
    
            this.addTableButtonListeners();
            
            // Update displayed count
            const countMessage = `${filteredMazes.length} maze${filteredMazes.length !== 1 ? 's' : ''} found`;
            MazeGame.utils.showMessage(countMessage, true);
            setTimeout(() => {
                if (MazeGame.elements.statusMessage) {
                    MazeGame.elements.statusMessage.classList.add('hidden');
                }
            }, MazeGame.config.messageDisplayTime);
        },

        /**
         * Adds event listeners to maze table buttons
         */
        addTableButtonListeners() {
            document.querySelectorAll('.play-button').forEach(button => {
                button.addEventListener('click', () => MazeGame.gameplay.playMaze(button.dataset.id));
            });
    
            document.querySelectorAll('.edit-button').forEach(button => {
                button.addEventListener('click', () => MazeGame.gameplay.editMaze(button.dataset.id));
            });
    
            document.querySelectorAll('.delete-button').forEach(button => {
                button.addEventListener('click', () => MazeGame.gameplay.deleteMaze(button.dataset.id));
            });
        },

        /**
         * Draws the maze on the canvas
         * @param {Array<Array<string>>} maze 2D array of maze cells
         */
        drawMaze(maze) {
            const { ctx, mazeCanvas } = MazeGame.elements;
            const { colors } = MazeGame.config;
            const { currentPath, isPlaying } = MazeGame.state;
            
            if (!maze || maze.length === 0) return;
    
            // Calculate cell size
            const width = Math.max(...maze.map(row => row.length));
            const height = maze.length;
            const cellSize = Math.min(
                Math.floor(mazeCanvas.width / width),
                Math.floor(mazeCanvas.height / height)
            );
    
            // Update the cellSize in state for other functions
            MazeGame.state.cellSize = Math.max(cellSize, 1);
    
            // Clear canvas
            ctx.clearRect(0, 0, mazeCanvas.width, mazeCanvas.height);
            ctx.fillStyle = colors.path;
            ctx.fillRect(0, 0, mazeCanvas.width, mazeCanvas.height);
    
            this.drawMazeElements(maze, cellSize);
            
            // Draw current path if playing
            if (isPlaying && currentPath.length > 0) {
                this.drawPath(currentPath, cellSize, colors.player);
            }
        },
        
        /**
         * Draws maze elements (walls, start, end)
         * @param {Array<Array<string>>} maze 2D array of maze cells
         * @param {number} cellSize Size of each cell in pixels
         */
        drawMazeElements(maze, cellSize) {
            const { ctx } = MazeGame.elements;
            const { colors } = MazeGame.config;
            
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
        },
        
        /**
         * Draws a path on the maze
         * @param {Array<{x: number, y: number}>} path Array of path points
         * @param {number} cellSize Size of each cell
         * @param {string} color Color for the path
         */
        drawPath(path, cellSize, color) {
            const { ctx } = MazeGame.elements;
            
            ctx.strokeStyle = color;
            ctx.lineWidth = cellSize / 3;
            ctx.beginPath();
            ctx.moveTo(
                path[0].x * cellSize + cellSize / 2,
                path[0].y * cellSize + cellSize / 2
            );
    
            for (let i = 1; i < path.length; i++) {
                ctx.lineTo(
                    path[i].x * cellSize + cellSize / 2,
                    path[i].y * cellSize + cellSize / 2
                );
            }
            ctx.stroke();
        },
        
        /**
         * Highlights start and end points of a path
         * @param {Array<{x: number, y: number}>} path Array of path points
         * @param {number} cellSize Size of each cell
         */
        highlightEndpoints(path, cellSize) {
            const { ctx } = MazeGame.elements;
            const { colors } = MazeGame.config;
            
            // Start point
            ctx.fillStyle = colors.start;
            ctx.beginPath();
            ctx.arc(
                path[0].x * cellSize + cellSize / 2,
                path[0].y * cellSize + cellSize / 2,
                cellSize / 4, 0, 2 * Math.PI
            );
            ctx.fill();
    
            // End point
            ctx.fillStyle = colors.end;
            ctx.beginPath();
            ctx.arc(
                path[path.length - 1].x * cellSize + cellSize / 2,
                path[path.length - 1].y * cellSize + cellSize / 2,
                cellSize / 4, 0, 2 * Math.PI
            );
            ctx.fill();
        },
        
        /**
         * Updates the solution info display
         * @param {number} stepCount Number of steps in solution
         */
        showSolutionInfo(stepCount) {
            const { solutionInfo, solutionLength } = MazeGame.elements;
            
            if (solutionInfo && solutionLength) {
                solutionLength.textContent = stepCount;
                solutionInfo.classList.remove('hidden');
            }
        },
        
        /**
         * Hides the solution info display
         */
        hideSolutionInfo() {
            const { solutionInfo } = MazeGame.elements;
            
            if (solutionInfo) {
                solutionInfo.classList.add('hidden');
            }
        }
    };

    // Game mechanics
    MazeGame.gameplay = {
        /**
         * Applies filters to the maze collection
         * @param {boolean} showMessage Whether to show filter messages
         */
        applyFilters(showMessage = true) {
            const { filterDifficulty, filterSize } = MazeGame.elements;
            const { allMazes } = MazeGame.state;
            const { filtersExist } = MazeGame.config;
            
            if (!filtersExist || allMazes.length === 0) return;
    
            const difficulty = filterDifficulty.value.trim();
            const size = filterSize.value.trim();
    
            // Validate size input if provided
            if (size && isNaN(parseInt(size))) {
                MazeGame.utils.showMessage('Size must be a number', false);
                return;
            }
    
            // Filter mazes based on criteria
            MazeGame.state.filteredMazes = allMazes.filter(maze => {
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
            MazeGame.utils.updateURLWithFilters({ difficulty, size });
            
            // Render the filtered table
            MazeGame.rendering.renderMazeTable();
    
            // Show appropriate message based on results
            if (showMessage) {
                if (MazeGame.state.filteredMazes.length === 0) {
                    MazeGame.utils.showRandomMessage(MazeGame.messages.noMazes, false);
                } else {
                    MazeGame.utils.showRandomMessage(MazeGame.messages.filtersApplied, true);
                }
            }
        },
    
        /**
         * Resets all filters and shows all mazes
         */
        resetFilters() {
            const { filterDifficulty, filterSize } = MazeGame.elements;
            const { allMazes } = MazeGame.state;
            const { filtersExist } = MazeGame.config;
            
            if (!filtersExist) return;
    
            // Clear filter inputs
            filterDifficulty.value = '';
            filterSize.value = '';
    
            // Clear URL parameters
            window.history.replaceState({}, '', window.location.pathname);
    
            // Reset to show all mazes
            MazeGame.state.filteredMazes = [...allMazes];
            MazeGame.rendering.renderMazeTable();
    
            MazeGame.utils.showRandomMessage(MazeGame.messages.filtersReset, true);
        },
    
        /**
         * Resets the current maze to initial state
         */
        resetMaze() {
            const { startCell, currentMaze } = MazeGame.state;
            
            if (!currentMaze || !startCell) {
                MazeGame.utils.showRandomMessage(MazeGame.messages.noMazeToReset, false);
                return;
            }
    
            // Reset path to just the starting position
            MazeGame.state.currentPath = [startCell];
    
            // Reset drawing state
            MazeGame.state.isDrawing = false;
            MazeGame.state.isPlaying = true;
    
            // Redraw the maze
            const parsedMaze = this.parseMazeData(currentMaze.data);
            MazeGame.rendering.drawMaze(parsedMaze);
    
            MazeGame.utils.showRandomMessage(MazeGame.messages.resetMaze, true);
        },
    
        /**
         * Loads and starts playing a specific maze
         * @param {string} mazeId The maze identifier
         */
        async playMaze(mazeId) {
            try {
                MazeGame.utils.showRandomMessage(MazeGame.messages.loading, true);
    
                const maze = await MazeGame.api.getMazeById(mazeId);
                MazeGame.state.currentMaze = maze;
                
                const parsedMaze = this.parseMazeData(maze.data);
                const positions = this.findStartEndPositions(parsedMaze);
                
                MazeGame.state.startCell = positions.start;
                MazeGame.state.endCell = positions.end;
    
                // Error handling for invalid maze
                if (!positions.start || !positions.end) {
                    MazeGame.utils.showRandomMessage(MazeGame.messages.invalidMaze, false);
                    return;
                }
    
                // Reset game state
                MazeGame.state.currentPath = [positions.start];
                MazeGame.state.isPlaying = true;
                MazeGame.state.isDrawing = false;
    
                // Draw and enable controls
                MazeGame.rendering.drawMaze(parsedMaze);
                
                // Clear solution info if displayed
                MazeGame.rendering.hideSolutionInfo();
                
                MazeGame.utils.showRandomMessage(MazeGame.messages.startingMaze, true);
    
                if (MazeGame.elements.solveButton) MazeGame.elements.solveButton.disabled = false;
                if (MazeGame.elements.resetButton) MazeGame.elements.resetButton.disabled = false;
            } catch (error) {
                console.error("Error playing maze:", error);
                MazeGame.utils.showMessage(`Error: ${error.message}`, false);
            }
        },
    
        /**
         * Parses maze data string into a 2D array
         * @param {string} mazeData The maze data string
         * @returns {Array<Array<string>>} 2D array of maze cells
         */
        parseMazeData(mazeData) {
            if (!mazeData) return [['#']]; // Return minimal maze if data is missing
    
            const trimmedText = mazeData.replace(/\n+$/, '');
            const lines = trimmedText.split('\n');
            const maxLength = Math.max(...lines.map(line => line.length), 1);
    
            return lines.map(line => {
                const paddedLine = line.padEnd(maxLength, ' ');
                return paddedLine.split('');
            });
        },
    
        /**
         * Finds start and end positions in the maze
         * @param {Array<Array<string>>} maze 2D array of maze cells
         * @returns {{start: {x: number, y: number}, end: {x: number, y: number}}} Start and end positions
         */
        findStartEndPositions(maze) {
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
                const paths = this.findAccessiblePaths(maze);
                if (paths.length >= 2) {
                    start = paths[0];
                    end = paths[paths.length - 1];
                }
            }
    
            return { start, end };
        },
    
        /**
         * Finds accessible path cells in the maze
         * @param {Array<Array<string>>} maze 2D array of maze cells
         * @returns {Array<{x: number, y: number}>} Array of accessible cells
         */
        findAccessiblePaths(maze) {
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
        },
        
        /**
         * Redirects to edit page for a maze
         * @param {string} mazeId The maze identifier
         */
        async editMaze(mazeId) {
            window.location.href = `edit.html?id=${mazeId}`;
        },
    
        /**
         * Deletes a maze and refreshes the list
         * @param {string} mazeId The maze identifier
         */
        async deleteMaze(mazeId) {
            const { currentUsername } = MazeGame.state;
            const { filtersExist } = MazeGame.config;
            
            if (!currentUsername) {
                MazeGame.utils.showRandomMessage(MazeGame.messages.loginRequired, false);
                return;
            }
        
            if (confirm('Are you sure you want to delete this maze?')) {
                try {
                    MazeGame.utils.showMessage('Deleting maze...', true);
                    
                    await MazeGame.api.deleteMaze(mazeId, currentUsername);
                    MazeGame.utils.showRandomMessage(MazeGame.messages.deletingMaze, true);
                    
                    // Reload all mazes from server
                    try {
                        const refreshedMazes = await MazeGame.api.getAllMazes();
                        
                        // Update both arrays with fresh data
                        MazeGame.state.allMazes = refreshedMazes;
                        
                        // Reapply any current filters
                        if (filtersExist) {
                            const difficulty = MazeGame.elements.filterDifficulty.value.trim();
                            const size = MazeGame.elements.filterSize.value.trim();
                            
                            if (difficulty || size) {
                                // Use existing filter function with the fresh data
                                MazeGame.gameplay.applyFilters(false); // Don't show filter message
                            } else {
                                // No filters, show all mazes
                                MazeGame.state.filteredMazes = [...MazeGame.state.allMazes];
                                MazeGame.rendering.renderMazeTable();
                            }
                        } else {
                            // No filters, simply update and render
                            MazeGame.state.filteredMazes = [...MazeGame.state.allMazes];
                            MazeGame.rendering.renderMazeTable();
                        }
                        
                        // Show updated count
                        const countMessage = `${MazeGame.state.filteredMazes.length} maze${MazeGame.state.filteredMazes.length !== 1 ? 's' : ''} found`;
                        MazeGame.utils.showMessage(countMessage, true);
                    } catch (refreshError) {
                        console.error("Error refreshing maze list:", refreshError);
                        // Fallback to the array filtering approach if refresh fails
                        MazeGame.state.allMazes = MazeGame.state.allMazes.filter(maze => maze.id !== mazeId);
                        MazeGame.state.filteredMazes = MazeGame.state.filteredMazes.filter(maze => maze.id !== mazeId);
                        MazeGame.rendering.renderMazeTable();
                    }
                } catch (error) {
                    console.error("Error deleting maze:", error);
                    MazeGame.utils.showMessage(`Error: ${error.message}`, false);
                }
            }
        },
        
        /**
         * Checks if a move to the target cell is valid
         * @param {number} x Target x coordinate
         * @param {number} y Target y coordinate
         * @returns {boolean} Whether move is valid
         */
        isValidMove(x, y) {
            const { currentMaze } = MazeGame.state;
            const maze = this.parseMazeData(currentMaze.data);
            
            // Check bounds and wall collision
            return !(x < 0 || x >= maze[0].length || y < 0 || y >= maze.length || maze[y][x] === '#');
        },
        
        /**
         * Processes a player move to target coordinates
         * @param {number} x Target x coordinate
         * @param {number} y Target y coordinate
         */
        processMove(x, y) {
            const { currentPath, endCell } = MazeGame.state;
            
            // Check if valid move
            if (!this.isValidMove(x, y)) {
                MazeGame.state.isDrawing = false;
                MazeGame.utils.showRandomMessage(MazeGame.messages.mazeFailure, false);
                return;
            }

            currentPath.push({ x, y });
            MazeGame.state.currentPath = currentPath;

            // Check for maze completion
            if (x === endCell.x && y === endCell.y) {
                MazeGame.state.isDrawing = false;
                const stepCount = currentPath.length - 1;
                
                // Format success message template with steps count
                const successMessages = MazeGame.messages.mazeSuccess.map(msg => 
                    msg.replace('{steps}', stepCount)
                );
                
                // Show solution info
                MazeGame.rendering.showSolutionInfo(stepCount);
                MazeGame.utils.showRandomMessage(successMessages, true);
            }

            // Redraw maze
            const maze = this.parseMazeData(MazeGame.state.currentMaze.data);
            MazeGame.rendering.drawMaze(maze);
        }
    };

    // Pathfinding operations
    MazeGame.pathfinding = {
        /**
         * Solves the current maze using BFS algorithm
         */
        async solveMaze() {
            const { currentMaze, startCell, endCell } = MazeGame.state;
            const { colors } = MazeGame.config;
            
            if (!currentMaze) {
                MazeGame.utils.showRandomMessage(MazeGame.messages.noMazeToSolve, false);
                return;
            }
    
            try {
                MazeGame.utils.showRandomMessage(MazeGame.messages.solvingMaze, true);
    
                const maze = MazeGame.gameplay.parseMazeData(currentMaze.data);
                const solution = this.autoSolveMaze(maze, startCell, endCell);
    
                if (solution.solvable) {
                    // Display the solution directly
                    MazeGame.state.currentPath = solution.path;
                    MazeGame.rendering.drawMaze(maze);
    
                    // Draw solution path and highlights
                    MazeGame.rendering.drawPath(solution.path, MazeGame.state.cellSize, colors.solution);
                    MazeGame.rendering.highlightEndpoints(solution.path, MazeGame.state.cellSize);
    
                    // Calculate solution length
                    const stepCount = solution.path.length - 1;
                    
                    // Store solution length in the maze object
                    MazeGame.state.currentMaze.solutionLength = stepCount;
                    
                    // Format auto-solve messages with step count
                    const autoSolveMessages = MazeGame.messages.autoSolveSuccess.map(msg => 
                        msg.replace('{steps}', stepCount)
                    );
                    
                    // Show solution info
                    MazeGame.rendering.showSolutionInfo(stepCount);
                    
                    // Display prominent message
                    const prominentMessage = `"${currentMaze.name}" has been solved! The solution length is ${stepCount} steps.`;
                    MazeGame.utils.showMessage(prominentMessage, true);
                    
                    // After a delay, show random message
                    setTimeout(() => {
                        MazeGame.utils.showRandomMessage(autoSolveMessages, true);
                    }, MazeGame.config.messageDisplayTime);
                } else {
                    MazeGame.utils.showRandomMessage(MazeGame.messages.noSolution, false);
                }
            } catch (error) {
                console.error("Error solving maze:", error);
                MazeGame.utils.showMessage(`Error during auto-solve: ${error.message}`, false);
            }
        },
    
        /**
         * Automatically solves a maze using BFS algorithm
         * @param {Array<Array<string>>} maze 2D array of maze cells
         * @param {Object} start Start position {x, y}
         * @param {Object} end End position {x, y}
         * @returns {{solvable: boolean, path: Array<{x: number, y: number}>}} Solution result
         */
        autoSolveMaze(maze, start, end) {
            if (!start || !end) return { solvable: false, path: [] };
    
            // Create matrices to track visited cells and parents
            const visited = Array(maze.length).fill().map(() =>
                Array(Math.max(...maze.map(row => row.length))).fill(false)
            );
    
            const parent = Array(maze.length).fill().map(() =>
                Array(Math.max(...maze.map(row => row.length))).fill(null)
            );
    
            // BFS algorithm
            return this.breadthFirstSearch(maze, start, end, visited, parent);
        },
        
        /**
         * Performs breadth-first search on the maze
         * @param {Array<Array<string>>} maze 2D array of maze cells
         * @param {Object} start Start position {x, y}
         * @param {Object} end End position {x, y}
         * @param {Array<Array<boolean>>} visited Visited cells matrix
         * @param {Array<Array<Object>>} parent Parent pointers matrix
         * @returns {{solvable: boolean, path: Array<{x: number, y: number}>}} Solution result
         */
        breadthFirstSearch(maze, start, end, visited, parent) {
            const queue = [];
            queue.push(start);
            visited[start.y][start.x] = true;
    
            // Direction vectors: up, right, down, left
            const dx = [0, 1, 0, -1];
            const dy = [-1, 0, 1, 0];
    
            let found = false;
    
            while (queue.length > 0 && !found) {
                const current = queue.shift();
    
                // Check if reached destination
                if (current.x === end.x && current.y === end.y) {
                    found = true;
                    break;
                }
    
                // Try all four directions
                for (let i = 0; i < 4; i++) {
                    const newX = current.x + dx[i];
                    const newY = current.y + dy[i];
    
                    // Check if valid move
                    if (this.isValidBFSMove(maze, newX, newY, visited)) {
                        queue.push({x: newX, y: newY});
                        visited[newY][newX] = true;
                        parent[newY][newX] = current;
                    }
                }
            }
    
            // Return solution if found
            return {
                solvable: found,
                path: found ? this.reconstructPath(start, end, parent) : []
            };
        },
        
        /**
         * Checks if a BFS move is valid
         * @param {Array<Array<string>>} maze 2D array of maze cells
         * @param {number} x Target x coordinate
         * @param {number} y Target y coordinate
         * @param {Array<Array<boolean>>} visited Visited cells matrix
         * @returns {boolean} Whether move is valid
         */
        isValidBFSMove(maze, x, y, visited) {
            return y >= 0 && y < maze.length &&
                   x >= 0 && x < maze[y].length &&
                   maze[y][x] !== '#' && !visited[y][x];
        },
        
        /**
         * Reconstructs path from BFS parent pointers
         * @param {Object} start Start position {x, y}
         * @param {Object} end End position {x, y}
         * @param {Array<Array<Object>>} parent Parent pointers matrix
         * @returns {Array<{x: number, y: number}>} Path from start to end
         */
        reconstructPath(start, end, parent) {
            const path = [];
            let current = end;
            path.unshift(current);
    
            while (current.x !== start.x || current.y !== start.y) {
                current = parent[current.y][current.x];
                path.unshift(current);
            }
            
            return path;
        }
    };

    // Event handlers
    MazeGame.events = {
        /**
         * Sets up all event listeners
         */
        setupEventListeners() {
            const { 
                filterDifficulty, filterSize, resetFiltersBtn,
                solveButton, resetButton, mazeCanvas 
            } = MazeGame.elements;
            
            const { filtersExist } = MazeGame.config;
    
            window.addEventListener('resize', MazeGame.rendering.resizeCanvas);
    
            // Filter event listeners
            if (filtersExist) {
                resetFiltersBtn.addEventListener('click', MazeGame.gameplay.resetFilters.bind(MazeGame.gameplay));
                
                // Add input event listeners for real-time filtering
                filterDifficulty.addEventListener('change', () => MazeGame.gameplay.applyFilters());
                filterSize.addEventListener('input', function() {
                    // Only apply filter if the input is empty or a valid number
                    if (this.value === '' || !isNaN(parseInt(this.value))) {
                        MazeGame.gameplay.applyFilters();
                    }
                });
            }
    
            // Maze control buttons
            if (solveButton) {
                solveButton.addEventListener('click', MazeGame.pathfinding.solveMaze.bind(MazeGame.pathfinding));
            }
    
            if (resetButton) {
                resetButton.addEventListener('click', MazeGame.gameplay.resetMaze.bind(MazeGame.gameplay));
            }
    
            // Canvas interaction
            mazeCanvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
            mazeCanvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
            mazeCanvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
            
            // Touch support
            mazeCanvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
            mazeCanvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
            mazeCanvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
            
            // Keyboard support
            document.addEventListener('keydown', this.handleKeyDown.bind(this));
        },
    
        /**
         * Handles mouse down event to start drawing
         * @param {MouseEvent} e Mouse event
         */
        handleMouseDown(e) {
            const { isPlaying, startCell, cellSize } = MazeGame.state;
            const { mazeCanvas } = MazeGame.elements;
            
            if (!isPlaying || !startCell) return;
    
            const rect = mazeCanvas.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) / cellSize);
            const y = Math.floor((e.clientY - rect.top) / cellSize);
    
            if (x === startCell.x && y === startCell.y) {
                MazeGame.state.isDrawing = true;
                MazeGame.state.currentPath = [{ x, y }];
                
                const parsedMaze = MazeGame.gameplay.parseMazeData(MazeGame.state.currentMaze.data);
                MazeGame.rendering.drawMaze(parsedMaze);
            }
        },
    
        /**
         * Handles mouse move event for path drawing
         * @param {MouseEvent} e Mouse event
         */
        handleMouseMove(e) {
            const { isDrawing, currentPath, cellSize } = MazeGame.state;
            const { mazeCanvas } = MazeGame.elements;
            
            if (!isDrawing) return;
    
            const rect = mazeCanvas.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) / cellSize);
            const y = Math.floor((e.clientY - rect.top) / cellSize);
    
            const lastPos = currentPath[currentPath.length - 1];
            if (x === lastPos.x && y === lastPos.y) return;
    
            MazeGame.gameplay.processMove(x, y);
        },
    
        /**
         * Handles mouse up event to stop drawing
         */
        handleMouseUp() {
            MazeGame.state.isDrawing = false;
        },
    
        /**
         * Handles touch start event
         * @param {TouchEvent} e Touch event
         */
        handleTouchStart(e) {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.handleMouseDown(mouseEvent);
        },
    
        /**
         * Handles touch move event
         * @param {TouchEvent} e Touch event
         */
        handleTouchMove(e) {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.handleMouseMove(mouseEvent);
        },
    
        /**
         * Handles touch end event
         * @param {TouchEvent} e Touch event
         */
        handleTouchEnd(e) {
            e.preventDefault();
            this.handleMouseUp();
        },
    
        /**
         * Handles keyboard navigation in the maze
         * @param {KeyboardEvent} e Keyboard event
         */
        handleKeyDown(e) {
            const { isPlaying, isDrawing, currentPath } = MazeGame.state;
            
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
                MazeGame.gameplay.processMove(newX, newY);
            }
        }
    };

    // Utilities
    MazeGame.utils = {
        /**
         * Shows a random message from a message array
         * @param {Array<string>} messageArray Array of messages
         * @param {boolean} isSuccess Whether it's a success message
         */
        showRandomMessage(messageArray, isSuccess) {
            if (!MazeGame.elements.statusMessage || !messageArray || messageArray.length === 0) return;
            
            const randomIndex = Math.floor(Math.random() * messageArray.length);
            this.showMessage(messageArray[randomIndex], isSuccess);
        },
    
        /**
         * Shows a message to the user
         * @param {string} message Message to display
         * @param {boolean} isSuccess Whether it's a success message
         */
        showMessage(message, isSuccess) {
            const { statusMessage } = MazeGame.elements;
            
            if (!statusMessage) return; // Safety check
    
            statusMessage.textContent = message;
            statusMessage.className = isSuccess ? 'result-message success' : 'result-message error';
            statusMessage.classList.remove('hidden');
    
            const shouldAutoHide = isSuccess && 
                !message.includes('solved') && 
                !message.includes('maze in') && 
                !message.includes('Loading');
                
            if (shouldAutoHide) {
                setTimeout(() => {
                    statusMessage.classList.add('hidden');
                }, MazeGame.config.messageDisplayTime);
            }
        },
    
        /**
         * Updates URL with current filters without reloading the page
         * @param {Object} filters Filter parameters
         */
        updateURLWithFilters(filters) {
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
    };

    // Main initialization function
    MazeGame.init = async function() {
        try {
            // Set up canvas
            MazeGame.rendering.resizeCanvas();
            
            // Load all mazes and set up event handlers
            MazeGame.utils.showRandomMessage(MazeGame.messages.loading, true);
            
            const mazes = await MazeGame.api.getAllMazes();
            MazeGame.state.allMazes = mazes;
            
            // Read URL parameters for initial filtering
            const urlParams = new URLSearchParams(window.location.search);
            const difficulty = urlParams.get('difficulty');
            const size = urlParams.get('size');

            // Set form values if filters exist in URL
            if (MazeGame.config.filtersExist) {
                if (difficulty) MazeGame.elements.filterDifficulty.value = difficulty;
                if (size) MazeGame.elements.filterSize.value = size;
            }

            // Apply any filters from URL or show all mazes
            if (difficulty || size) {
                MazeGame.gameplay.applyFilters(false);
            } else {
                MazeGame.state.filteredMazes = [...mazes];
                MazeGame.rendering.renderMazeTable();
            }
            
            // Set up event listeners
            MazeGame.events.setupEventListeners();

            // Show load complete message
            const loadingMessage = `${mazes.length} total maze${mazes.length !== 1 ? 's' : ''} available`;
            MazeGame.utils.showMessage(loadingMessage, true);
            setTimeout(() => {
                if (MazeGame.elements.statusMessage) {
                    MazeGame.elements.statusMessage.classList.add('hidden');
                }
            }, MazeGame.config.messageDisplayTime);
        } catch (error) {
            console.error("Error initializing maze game:", error);
            MazeGame.utils.showMessage(`Error loading mazes: ${error.message}`, false);
        }
    };

    // Start the application
    MazeGame.init();
});