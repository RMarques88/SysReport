<?php
require_once __DIR__ . '/config/db.php';

class Mailer {
    private $pdo;

    public function __construct() {
        global $pdo;
        $this->pdo = $pdo;
    }

    private function getConfig() {
        try {
            $stmt = $this->pdo->query("SELECT setting_key, setting_value FROM system_settings");
            return $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        } catch (Exception $e) {
            return [];
        }
    }

    public function send($to, $subject, $body) {
        $config = $this->getConfig();
        
        $host = $config['smtp_host'] ?? 'smtp.example.com';
        $port = $config['smtp_port'] ?? 587;
        $user = $config['smtp_user'] ?? '';
        $pass = $config['smtp_pass'] ?? '';
        $secure = $config['smtp_secure'] ?? 'tls';
        $from = $config['smtp_from_email'] ?? 'noreply@example.com';
        $fromName = $config['smtp_from_name'] ?? 'SysReport';

        if ($host === 'smtp.example.com' || empty($host)) {
            // Log that we are in dummy mode, fallback to mail() or just log
            error_log("Mailer: SMTP not configured. Using mail() fallback.");
            return @mail($to, $subject, $body);
        }

        try {
            $socketHost = ($secure === 'ssl' ? 'ssl://' : '') . $host;
            $socket = fsockopen($socketHost, $port, $errno, $errstr, 15);

            if (!$socket) {
                throw new Exception("Could not connect to SMTP host: $errstr ($errno)");
            }

            $serverName = isset($_SERVER['SERVER_NAME']) ? $_SERVER['SERVER_NAME'] : 'localhost';
            $this->getResponse($socket, "220"); // Welcome
            $this->serverCmd($socket, "EHLO " . $serverName, "250");

            if ($secure === 'tls') {
                $this->serverCmd($socket, "STARTTLS", "220");
                stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
                $this->serverCmd($socket, "EHLO " . $serverName, "250");
            }

            $this->serverCmd($socket, "AUTH LOGIN", "334");
            $this->serverCmd($socket, base64_encode($user), "334");
            $this->serverCmd($socket, base64_encode($pass), "235");

            $this->serverCmd($socket, "MAIL FROM: <$from>", "250");
            $this->serverCmd($socket, "RCPT TO: <$to>", "250");
            $this->serverCmd($socket, "DATA", "354");

            $headers = "MIME-Version: 1.0\r\n";
            $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
            $headers .= "From: $fromName <$from>\r\n";
            $headers .= "To: $to\r\n";
            $headers .= "Subject: $subject\r\n";
            $headers .= "Date: " . date("r") . "\r\n";

            $htmlBody = $this->getHtmlTemplate($subject, $body);

            fwrite($socket, $headers . "\r\n" . $htmlBody . "\r\n.\r\n");
            $this->getResponse($socket, "250");

            $this->serverCmd($socket, "QUIT", "221");
            fclose($socket);

            return true;

        } catch (Exception $e) {
            error_log("SMTP Error: " . $e->getMessage());
            return false;
        }
    }

    private function getHtmlTemplate($title, $content) {
        // Convert newlines to <br> if content doesn't look like HTML tags
        if (strpos($content, '<p>') === false && strpos($content, '<div>') === false && strpos($content, '<br>') === false) {
            $content = nl2br(htmlspecialchars($content));
        }

        return "
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f9; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid #e2e8f0; }
                .header { background-color: #2563eb; color: #ffffff; padding: 25px; text-align: center; }
                .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
                .content { padding: 30px; color: #334155; line-height: 1.6; font-size: 16px; }
                .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 14px; color: #64748b; border-top: 1px solid #e2e8f0; }
                .highlight { color: #2563eb; font-weight: 600; }
                .urgent { color: #dc2626; font-weight: 700; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>SysReport</h1>
                </div>
                <div class='content'>
                    $content
                </div>
                <div class='footer'>
                    <p>Acesse o sistema <a href='http://sysreport.pmpalmital.local' style='color: #2563eb; text-decoration: none; font-weight: bold;'>SysReport</a> para enviar seu relatório.</p>
                    <p style='margin-top: 10px; font-weight: bold;'>Se tiver dúvidas, entre em contato com o Setor de TI da Prefeitura de Palmital/SP</p>
                    <p style='margin-top: 10px; font-size: 12px;'>&copy; " . date('Y') . " Prefeitura Municipal de Palmital</p>
                </div>
            </div>
        </body>
        </html>";
    }

    private function serverCmd($socket, $cmd, $expect) {
        fwrite($socket, $cmd . "\r\n");
        $this->getResponse($socket, $expect);
    }

    private function getResponse($socket, $expect) {
        $response = "";
        $line = "";
        do {
            if (!($line = fgets($socket, 515))) {
                throw new Exception("Error reading from SMTP server");
            }
            $response .= $line;
        } while (substr($line, 3, 1) != ' ');

        if (substr($response, 0, 3) != $expect) {
            throw new Exception("SMTP Error: Expected $expect, got $response");
        }
    }
}
?>
