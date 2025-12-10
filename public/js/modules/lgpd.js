import { getProjectBaseUrl } from '../core/base.js';
import { setCurrentUser, getState } from '../core/state.js';

export function initLgpd() {
    const { currentUser } = getState();
    if (!currentUser.lgpdAccepted) {
        const modal = document.getElementById('lgpdModal');
        if (modal) modal.style.display = 'block';
    }
    const btn = document.getElementById('acceptLgpdBtn');
    if (btn) btn.addEventListener('click', acceptLgpd);
}

async function acceptLgpd() {
    const checkbox = document.getElementById('acceptLgpdInput');
    if (!checkbox || !checkbox.checked) {
        Swal.fire('Atenção', 'Você precisa marcar a caixa de concordância.', 'warning');
        return;
    }
    try {
        const response = await fetch(getProjectBaseUrl() + '/src/api/lgpd.php', { method: 'POST' });
        if (!response.ok) throw new Error('Falha ao registrar aceite.');
        const result = await response.json();
        if (result.success) {
            const modal = document.getElementById('lgpdModal');
            if (modal) modal.style.display = 'none';
            setCurrentUser({ lgpdAccepted: true });
            Swal.fire('Obrigado', 'Termos aceitos.', 'success');
        } else {
            Swal.fire('Erro', result.message || 'Não foi possível salvar a aceitação.', 'error');
        }
    } catch (e) {
        console.error(e);
        Swal.fire('Erro', 'Não foi possível registrar sua aceitação. Tente novamente.', 'error');
    }
}
