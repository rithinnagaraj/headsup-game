# APP NAME:
Who am I? (Working Title)

# DESCRIPTION:
A multiplayer web/mobile game where users join a room via a code to play a digital version of "Headbands."

1. Setup & Assignment:

- Lobby: Users join, enter a name, and take/upload a selfie as their avatar.

- The Assignment: The system assigns a target player to every user using a hidden circular linked list (User A → User B → User C → User A). Players cannot change this order.

- Identity Creation: Players assign a popular personality to their target by uploading an image and/or typing a name.

- Fuzzy Logic: Players must input the "Display Name" (e.g., "The Rock") and optional "Allowed Aliases" (e.g., "Dwayne Johnson") to ensure fair guessing.

2. The Game Loop (Text & Touch Only):

- The View: Each player sees a grid of opponents with their assigned identities revealed. The player's own identity is hidden behind a "GUESS ME" card.

- Turn-Based Questioning: The game highlights one "Active Guesser" at a time. This player has 45 seconds to type a "Yes/No" question into the chat box.

- The Voting Phase: Once a question is sent, all other players see "YES", "NO", and "MAYBE" buttons.

- Mechanism: Voting results update in real-time (e.g., "3 Yes, 0 No"). The game does not wait for all players to vote; the Guesser can act on partial information to keep the pace fast.

- History Log: A scrollable chat log records every question and its final vote tally for reference.

3. Interaction & Guessing:

- Reactions: Players can tap emoji reactions at any time, which float briefly over the target user's video/avatar.

- The Guess: A dedicated "Make a Guess" button allows the Active Guesser to type their answer.

- Validation: The system compares the input against the "Display Name" and "Allowed Aliases" using fuzzy string matching.

- Penalty: To prevent spam, a wrong guess locks the guessing input for 10 seconds.

4. Win State & Progression:

- Correct Guess: If correct, the player receives audio/visual fanfare, and their card flips to reveal their identity.

- The "Spectator-Participant": The winner is skipped in the questioning rotation (no longer asks questions) but remains in the game to vote on others' questions.

- End Game: The game continues until all players have guessed or a "Give Up" threshold is met. A final scoreboard displays rankings based on who guessed in the fewest turns.

# Tech Stack

1. Frontend (The UI)
Framework: Next.js (React)

- Why: It handles routing and state management beautifully. You'll need distinct "pages" for the Lobby, Assignment, and Game Board. React's component model is perfect for the "Grid of Players" view.

- Styling: Tailwind CSS

- Why: You don't want to waste time writing custom CSS classes for "floating emojis" or responsive grids. Tailwind lets you build the "Card Flip" and "Grid Layout" rapidly.

- State Management: Zustand

- Why: It is much simpler than Redux. You need a global store to track currentTurnPlayer, myVotes, and chatHistory across components without prop-drilling hell.

2. Backend (The Real-Time Engine)
- Runtime: Node.js with Express

- Why: Node is the industry standard for real-time apps because of its non-blocking I/O.

- Communication: Socket.io (Crucial)

- Why: This is the heart of your app. You cannot use standard HTTP REST APIs for the game loop because they are too slow (request/response). Socket.io allows the server to push data (e.g., "Player B voted YES") to all clients instantly.

- Language: TypeScript

- Why: You have complex data structures (the circular linked list, the game state object). TypeScript will save you from 90% of "undefined is not an object" bugs during the logic phase.

3. Database (The Storage)
- Primary DB: Redis (In-Memory)

- Why: This is a "session-based" game. You don't necessarily need to store game history forever. Redis is lightning fast for storing the GameState object that changes every second.

- Alternative: If you want to persist user stats (e.g., "Total Wins"), use PostgreSQL (via Prisma ORM) for user accounts and keep the active game state in memory (Node variables or Redis).

4. DevOps (Deployment)
- Frontend/Backend: Vercel (Frontend) + Render/Railway (Backend)

- Why: Vercel is great for Next.js, but Vercel Serverless functions have a hard time maintaining long-running Socket connections. It is often better to host the separate Node/Socket server on Render or Railway (which allow persistent connections) and host the UI on Vercel.