# SysReport - Sistema de Gerenciamento de Relatórios

O **SysReport** é uma plataforma web para gerenciamento, envio e controle de relatórios corporativos. Permite que administradores solicitem relatórios a usuários, definam prazos, e acompanhem o status de entrega (Pendente, Enviado, Atrasado). Suporta upload de arquivos (XLS, DOC, DOCX), versionamento de arquivos e notificações por e-mail.

## 🚀 Funcionalidades

- **Painel Administrativo**:
  - Criação de tipos de relatórios.
  - Atribuição de relatórios a usuários com prazos definidos.
  - Acompanhamento de status em tempo real.
  - Visualização e download de arquivos enviados.
  - Substituição de arquivos (Admin Override).
  - Arquivamento de relatórios antigos.
  - Gestão de usuários e setores.

- **Painel do Usuário**:
  - Visualização de relatórios pendentes e agendados.
  - Upload de arquivos (arrastar e soltar ou seleção).
  - Histórico de versões enviadas.
  - Visualização rápida de arquivos (Preview de Excel e Word).

- **Sistema**:
  - Notificações automáticas por e-mail (via Cron).
  - Controle de acesso baseado em funções (Admin, User, SuperAdmin).
  - Logs de auditoria.

## 🛠️ Requisitos

- **Servidor Web**: Apache (com `mod_rewrite` habilitado).
- **PHP**: 7.4 ou superior.
  - Extensões: `pdo_mysql`, `json`, `zip` (para preview de DOCX).
- **Banco de Dados**: MySQL 5.7 ou superior / MariaDB.
- **Sistema Operacional**: Linux (Recomendado Ubuntu/Debian).

## 📦 Instalação

### 1. Clonar o Repositório
```bash
git clone https://github.com/rmarques88/sysreport.git
cd sysreport
```

### 2. Configurar o Banco de Dados
1. Crie um banco de dados no MySQL (ex: `report_system`).
2. Importe o esquema inicial localizado em `DB/schema.sql`:
```bash
mysql -u root -p report_system < DB/schema.sql
```
*Isso criará as tabelas e os usuários padrão (`admin` e `superadmin`).*

### 3. Configuração do Ambiente (.env)
Copie o modelo de configuração e edite com suas credenciais:
```bash
cp .env.model .env
nano .env
```
Preencha as informações do banco de dados:
```ini
DB_HOST=localhost
DB_NAME=report_system
DB_USER=seu_usuario
DB_PASS=sua_senha
```

### 4. Permissões de Pasta e Estrutura de Uploads
O sistema armazena os arquivos na pasta `uploads/` na **raiz do projeto** (fora da pasta `public` para segurança), mas cria um link simbólico para acesso web controlado.

Execute os comandos abaixo na raiz do projeto (`/var/www/html/sysreport`):

```bash
# 1. Cria a pasta de uploads e templates se não existirem
mkdir -p uploads/templates

# 2. Ajusta o dono para o usuário do Apache (geralmente www-data no Ubuntu/Debian)
# Isso é CRÍTICO para que o PHP consiga salvar os arquivos.
sudo chown -R www-data:www-data uploads/

# 3. Ajusta as permissões de escrita (755 ou 775)
sudo chmod -R 775 uploads/

# 4. Cria o Link Simbólico para acesso público (Necessário para download/visualização)
# O link deve ficar dentro de public/ apontando para ../uploads
ln -s /var/www/html/sysreport/uploads /var/www/html/sysreport/public/uploads
```

### 5. Configuração do Apache (VirtualHost)
O sistema foi projetado para ter a pasta `public` como raiz do servidor web (`DocumentRoot`). Isso impede acesso direto aos códigos fonte em `src/` e `DB/`.

1. O arquivo de configuração `sysreport.conf` já está incluído na raiz do projeto. Ele deve se parecer com isso:

```apache
<VirtualHost *:80>
    # Ajuste o caminho conforme sua instalação
    DocumentRoot /var/www/html/sysreport/public

    <Directory /var/www/html/sysreport/public>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # Permite acesso à API
    Alias /src/api /var/www/html/sysreport/src/api
    <Directory /var/www/html/sysreport/src/api>
        Options FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
```

2. Copie e habilite o site:
```bash
sudo cp sysreport.conf /etc/apache2/sites-available/sysreport.conf
sudo a2enmod rewrite
sudo a2ensite sysreport.conf
sudo systemctl reload apache2
```

### 6. Configuração de Tarefas Agendadas (Cron)
Para que o sistema envie notificações de atraso e novos relatórios diariamente, configure o Cron:

```bash
crontab -e
```
Adicione a seguinte linha (executa todo dia às 08:00):
```bash
0 8 * * * /usr/bin/php /var/www/html/sysreport/src/scheduler/notification.php >> /var/log/sysreport_cron.log 2>&1
```

## 🔑 Acesso Inicial

Acesse o sistema pelo navegador (ex: `http://seu-ip-ou-dominio`).

**Usuários Padrão (criados pelo schema.sql):**
- **Admin**: `admin` / (senha definida no hash do schema, geralmente `password` ou `admin` em dev)
- **SuperAdmin**: `superadmin` / (senha definida no hash)

Obs: Caso tenha problema ao acessar, entre na página reset_admin.php e tente novamente na sequência.
Importante: Remova o reset_admin.php após conseguir acesso para evitar reset indevido da senha futuramente.

*Recomendamos alterar as senhas imediatamente após o primeiro acesso.*

## 📧 Configuração de E-mail (SMTP)

Para que o sistema envie notificações automáticas (novos relatórios, atrasos, etc.), é necessário configurar o servidor SMTP.

1. Acesse o sistema com o usuário **SuperAdmin** (login: `superadmin`).
2. No menu lateral, clique em **Infraestrutura**.
3. No topo da página, clique no botão **SMTP** (ícone de engrenagem).
4. Preencha os dados do seu servidor de e-mail:
   - **Host**: Endereço do servidor SMTP (ex: `smtp.gmail.com`).
   - **Porta**: Geralmente `587` (TLS) ou `465` (SSL).
   - **Usuário**: Seu endereço de e-mail completo.
   - **Senha**: Sua senha de e-mail.

**⚠️ Importante para Gmail, Outlook e Yahoo:**
Se você utiliza provedores de e-mail gratuitos com autenticação de dois fatores (2FA), **não utilize sua senha de login pessoal**.
Você deve gerar uma **Senha de Aplicativo (App Password)** nas configurações de segurança da sua conta e utilizá-la no campo de senha do sistema.

- **Gmail**: Conta Google > Segurança > Verificação em duas etapas > Senhas de app.
- **Outlook/Hotmail**: Conta Microsoft > Segurança > Opções de segurança avançadas > Senhas de aplicativos.

## 💾 Rotinas de Backup

O sistema possui ferramentas integradas para backup simplificado, acessíveis apenas ao **SuperAdmin**.

1. Acesse o sistema como **SuperAdmin**.
2. Vá em **Infraestrutura**.
3. No topo da página, utilize os botões de backup:

- **Backup DB**: Gera e baixa instantaneamente um arquivo `.sql` contendo toda a estrutura e dados do banco de dados.
- **Backup Completo**: Gera e baixa um arquivo `.zip` contendo:
  - O dump atualizado do banco de dados (`database.sql`).
  - Todos os arquivos da pasta `uploads/` (relatórios e modelos).
  - Todos os arquivos de código base do sistema.
  - O arquivo de configuração `.env`.

*Recomendamos realizar o Backup Completo periodicamente e armazená-lo em um local seguro fora do servidor.*

## 📂 Estrutura de Pastas

- `public/`: Arquivos acessíveis via web (index.php, css, js, uploads symlink).
- `src/`: Código fonte backend (PHP), API, configurações (protegido).
- `DB/`: Scripts de banco de dados.
- `uploads/`: Armazenamento de arquivos enviados pelos usuários.

## 🛡️ Segurança

- O acesso direto à pasta `src/` e `DB/` é bloqueado via `.htaccess` e configuração do Apache.
- As senhas são hashadas usando `password_hash` (Bcrypt).
- Uploads são validados por extensão (XLS, XLSX, DOC, DOCX).

---
Desenvolvido para gestão eficiente de entregas corporativas.
