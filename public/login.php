<?php
require_once __DIR__ . '/../src/auth.php';
if (isLoggedIn()) {
    header('Location: index.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Sistema de Relatórios</title>
    <link rel="stylesheet" href="css/style.css">
    <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body class="login-page">

    <div class="login-card">
        <div class="login-header">
            <i class="fas fa-file-alt fa-3x"></i>
            <h1>SysReport</h1>
        </div>
        <div class="login-body">
            <form id="loginForm">
                <div class="form-group">
                    <label for="username">Usuário</label>
                    <input type="text" class="form-control" id="username" name="username" placeholder="Digite seu usuário" required>
                </div>
                <div class="form-group">
                    <label for="password">Senha</label>
                    <input type="password" class="form-control" id="password" name="password" placeholder="Digite sua senha" required>
                </div>
                <button type="submit" class="btn">
                    <i class="fas fa-sign-in-alt"></i> ENTRAR
                </button>
                <div id="loginError" style="color: red; margin-top: 10px; text-align: center; display: none;">
                    Usuário ou senha inválidos.
                </div>
            </form>
        </div>
        <div class="login-footer">
            <i class="fas fa-building"></i> Prefeitura Municipal - 2025
        </div>
    </div>

    <script>
        function getProjectBaseUrl() {
            const path = window.location.pathname;
            // Remove /public/login.php or similar from the path
            const match = path.match(/^(.*?)\/public\//);
            if (match) {
                return match[1]; // Returns the base path before /public/
            }
            return '';
        }

        document.getElementById('loginForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch(getProjectBaseUrl() + '/src/api/login.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    window.location.href = result.redirect;
                } else {
                    document.getElementById('loginError').style.display = 'block';
                    document.getElementById('loginError').textContent = result.message;
                }
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('loginError').style.display = 'block';
                document.getElementById('loginError').textContent = 'Erro ao conectar com o servidor.';
            }
        });
    </script>
</body>
</html>
