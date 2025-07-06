document.addEventListener('DOMContentLoaded', function() {
    const catalogTree = document.getElementById('catalogTree');
    const vehicleNumberInput = document.getElementById('vehicleNumberInput');
    const searchByNumberBtn = document.getElementById('searchByNumberBtn');
    const searchMessage = document.getElementById('searchMessage');
    const welcomeSection = document.getElementById('welcomeSection');
    // PDF görüntüleyici ile ilgili DOM elementlerine artık doğrudan ihtiyacımız yok
    // const contentViewer = document.getElementById('contentViewer');
    // const pdfViewerContainer = document.querySelector('.pdf-viewer-container');
    // const pdfFrame = document.getElementById('pdfFrame');

    let allCatalogsData = [];

    fetch('data.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('data.json yüklenemedi: ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            allCatalogsData = data;
            createCatalogTree(data, catalogTree);
        })
        .catch(error => {
            console.error('Katalog verisi yüklenirken bir hata oluştu:', error);
            catalogTree.innerHTML = '<li>Katalog verileri yüklenemedi. Lütfen konsolu kontrol edin.</li>';
            searchMessage.textContent = 'Katalog verileri yüklenemedi.';
            searchMessage.style.color = 'red';
        });

    // Menüyü (soy ağacını) dinamik olarak oluşturan fonksiyon
    function createCatalogTree(items, parentElement) {
        items.forEach(item => {
            const listItem = document.createElement('li');
            const link = document.createElement('a');

            if (item.icon) {
                const icon = document.createElement('i');
                icon.className = item.icon;
                link.appendChild(icon);
            }

            link.appendChild(document.createTextNode(item.name));

            if (item.type === 'category' && item.children) {
                link.href = '#';
                listItem.classList.add('has-submenu');

                link.addEventListener('click', function(event) {
                    event.preventDefault();
                    const subMenu = listItem.querySelector('ul');
                    if (subMenu) {
                        catalogTree.querySelectorAll('li.has-submenu > ul').forEach(function(ul) {
                            if (ul !== subMenu && ul.style.maxHeight !== '0px') {
                                ul.style.maxHeight = '0px';
                                ul.parentElement.classList.remove('active');
                            }
                        });
                        if (subMenu.style.maxHeight === '0px' || subMenu.style.maxHeight === '') {
                            subMenu.style.maxHeight = subMenu.scrollHeight + 'px';
                            listItem.classList.add('active');
                        } else {
                            subMenu.style.maxHeight = '0px';
                            listItem.classList.remove('active');
                        }
                    }
                    // Kategoriye tıklanınca hoş geldiniz durumuna dön
                    resetContentView();
                });

                const subList = document.createElement('ul');
                subList.classList.add('submenu');
                listItem.appendChild(link);
                listItem.appendChild(subList);
                createCatalogTree(item.children, subList);
            } else if (item.type === 'item' && item.source_path) {
                link.href = '#'; // JS ile açılacağı için sayfa atlamasını engelle
                link.dataset.sourcePath = item.source_path;
                link.dataset.sourceType = item.source_type;

                link.addEventListener('click', function(event) {
                    event.preventDefault();
                    // Her zaman yeni sekmede aç
                    window.open(this.dataset.sourcePath, '_blank'); 
                    // Aktif linki işaretle
                    catalogTree.querySelectorAll('li a').forEach(a => a.classList.remove('current-active-pdf'));
                    this.classList.add('current-active-pdf');
                    // Yeni sekme açıldığı için içerik görünümünü başlangıca döndür
                    resetContentView(); 
                });
                listItem.appendChild(link);
            }
            parentElement.appendChild(listItem);
        });
    }

    // Katalog kaynağını gösterme fonksiyonu (artık sadece window.open çağıracak)
    // showCatalogSource fonksiyonuna artık doğrudan ihtiyaç yok, çünkü window.open direkt çağrılıyor.
    // Ancak performSearch içinde hala çağrılıyor, o yüzden onu da güncelleyeceğiz.
    
    // İçerik alanını başlangıç durumuna (Hoş Geldiniz) döndüren fonksiyon
    function resetContentView() {
        welcomeSection.style.display = 'block'; // Hoş geldiniz mesajını göster
        // pdfViewerContainer.style.display = 'none'; // PDF görüntüleyici divi gizle (HTML'den kaldırabiliriz)
        // pdfFrame.src = ''; // iframe içeriğini temizle (HTML'den kaldırabiliriz)
        catalogTree.querySelectorAll('li a').forEach(a => a.classList.remove('current-active-pdf'));
    }


    // Araç Numarası ile Arama Fonksiyonu
    searchByNumberBtn.addEventListener('click', performSearch);
    vehicleNumberInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            performSearch();
        }
    });

    function performSearch() {
        const searchTerm = vehicleNumberInput.value.trim().toUpperCase();
        searchMessage.textContent = '';
        searchMessage.style.color = 'initial';

        if (searchTerm === '') {
            searchMessage.textContent = 'Lütfen bir araç numarası girin.';
            searchMessage.style.color = 'orange';
            resetContentView();
            return;
        }

        let foundItem = null;
        function searchInItems(items) {
            for (const item of items) {
                if (item.type === 'item') {
                    if (item.vehicle_numbers && item.vehicle_numbers.some(num => num.toUpperCase().includes(searchTerm))) {
                        foundItem = item;
                        return true;
                    }
                } else if (item.type === 'category' && item.children) {
                    if (searchInItems(item.children)) {
                        return true;
                    }
                }
            }
            return false;
        }

        searchInItems(allCatalogsData);

        if (foundItem) {
            searchMessage.textContent = `Bulundu: ${foundItem.name}`;
            searchMessage.style.color = 'green';
            
            // Arama sonucunda da her zaman yeni sekmede aç
            window.open(foundItem.source_path, '_blank'); 

            // Menüde ilgili öğeyi işaretle ve aç
            catalogTree.querySelectorAll('li a').forEach(a => a.classList.remove('current-active-pdf'));
            const correspondingLink = Array.from(catalogTree.querySelectorAll('li a')).find(link => link.dataset.sourcePath === foundItem.source_path);
            if (correspondingLink) {
                correspondingLink.classList.add('current-active-pdf');
                let parentUl = correspondingLink.closest('ul');
                while(parentUl && parentUl.classList.contains('submenu') && parentUl.style.maxHeight === '0px') {
                    parentUl.style.maxHeight = parentUl.scrollHeight + 'px';
                    parentUl.parentElement.classList.add('active');
                    parentUl = parentUl.parentElement.closest('ul');
                }
            }
            resetContentView(); // Yeni sekme açıldığı için içerik görünümünü başlangıca döndür

        } else {
            searchMessage.textContent = `"${searchTerm}" numarasına sahip araç bulunamadı.`;
            searchMessage.style.color = 'red';
            resetContentView();
        }
    }

    // Arama kutusu boşaldığında hoş geldiniz durumuna dön
    vehicleNumberInput.addEventListener('input', function() {
        if (this.value.trim() === '') {
            resetContentView();
        }
    });
});