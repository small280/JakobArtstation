function showToast(message, isError = false) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    
    toast.textContent = message;
    
    // 에러 여부에 따라 error 클래스 토글
    if (isError) {
        toast.classList.add("error");
    } else {
        toast.classList.remove("error");
    }

    toast.classList.add("show");
    
    setTimeout(() => {
        toast.classList.remove("show");
    }, 2000);
}

// 관리자 로그인 버튼 클릭 시 모달 열기
function checkAdminPassword(event) {
    if (event) event.preventDefault();
    const modal = document.getElementById('admin-modal');
    if (modal) {
        modal.classList.add('show');
        const input = document.getElementById('admin-password-input');
        if (input) {
            input.value = '';
            input.focus();
        }
    }
}

// 모달 닫기
function closeAdminModal() {
    const modal = document.getElementById('admin-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// 엔터키 입력 시 확인
function handleAdminKeydown(event) {
    if (event.key === 'Enter') {
        submitAdminPassword();
    }
}

// 비밀번호 확인 및 처리
function submitAdminPassword() {
    const passwordInput = document.getElementById('admin-password-input');
    if (!passwordInput) return;
    
    const enteredPassword = passwordInput.value;
    const correctPassword = '1907'; // 실제 사용하는 비밀번호

    if (enteredPassword === correctPassword) {
        window.location.href = 'admin.html';
    } else {
        // 비밀번호 오류 시 두 번째 인자에 true를 전달하여 빨간색 토스트 출력
        showToast('비밀번호가 올바르지 않습니다.', true);
        passwordInput.value = '';
        passwordInput.focus();
    }
}