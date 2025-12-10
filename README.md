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

### 4. Permissões de Pasta
O Apache precisa de permissão de escrita na pasta de uploads e logs (se houver).
```bash
# Cria a pasta de uploads se não existir
mkdir -p uploads/templates

# Ajusta o dono para o usuário do Apache (geralmente www-data)
chown -R www-data:www-data uploads/
chmod -R 755 uploads/
```

### 5. Configuração do Apache (VirtualHost)
O sistema foi projetado para ter a pasta `public` como raiz do servidor web para maior segurança.

1. Copie o arquivo de configuração fornecido:
```bash
sudo cp sysreport.conf /etc/apache2/sites-available/sysreport.conf
```

2. Habilite o site e o módulo rewrite:
```bash
sudo a2enmod rewrite
sudo a2ensite sysreport.conf
sudo systemctl reload apache2
```

*Nota: Certifique-se de que o caminho no `sysreport.conf` corresponde ao local onde você clonou o projeto.*

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
