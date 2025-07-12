document.addEventListener('DOMContentLoaded', function() {
    const catalogTree = document.getElementById('catalogTree');
    const vehicleNumberInput = document.getElementById('vehicleNumberInput');
    const searchByNumberBtn = document.getElementById('searchByNumberBtn');
    const searchMessage = document.getElementById('searchMessage');
    const welcomeSection = document.getElementById('welcomeSection');

    let allCatalogsData = []; // Tüm JSON verisini tutacak global değişken

    // data.json dosyasını yükle
    fetch('data.json')
        .then(response => {
            if (!response.ok) {
                // Hata durumunda HTTP statüsünü de göster
                throw new Error('data.json yüklenemedi: ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            allCatalogsData = data; // Yüklenen veriyi global değişkene ata
            createCatalogTree(data, catalogTree); // Katalog ağacını oluştur
            console.log("Katalog verileri başarıyla yüklendi.");
        })
        .catch(error => {
            console.error('Katalog verisi yüklenirken bir hata oluştu:', error);
            catalogTree.innerHTML = '<li>Katalog verileri yüklenemedi. Lütfen konsolu kontrol edin.</li>';
            searchMessage.textContent = 'Katalog verileri yüklenemedi.';
            searchMessage.style.color = 'red';
        });

    // Menüyü (katalog ağacını) dinamik olarak oluşturan fonksiyon
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
                        // Diğer açık alt menüleri kapat
                        catalogTree.querySelectorAll('li.has-submenu > ul').forEach(function(ul) {
                            if (ul !== subMenu && ul.style.maxHeight !== '0px') {
                                ul.style.maxHeight = '0px';
                                ul.parentElement.classList.remove('active');
                            }
                        });
                        // Tıklanan alt menüyü aç/kapat
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

    // İçerik alanını başlangıç durumuna (Hoş Geldiniz) döndüren fonksiyon
    function resetContentView() {
        welcomeSection.style.display = 'block'; // Hoş geldiniz mesajını göster
        // PDF görüntüleyici ile ilgili eski yorum satırları çıkarıldı, çünkü artık doğrudan window.open kullanılıyor.
        catalogTree.querySelectorAll('li a').forEach(a => a.classList.remove('current-active-pdf'));
    }

    // --- Araç Numarası ile Arama Fonksiyonları ---

    // Arama butonuna tıklama olayını dinle
    searchByNumberBtn.addEventListener('click', performSearch);
    // Arama kutusunda Enter tuşuna basma olayını dinle
    vehicleNumberInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            performSearch();
        }
    });

    function performSearch() {
        const searchTerm = vehicleNumberInput.value.trim(); // Girişteki boşlukları temizle
        searchMessage.textContent = ''; // Önceki mesajı temizle
        searchMessage.style.color = 'initial'; // Renki sıfırla

        if (searchTerm === '') {
            searchMessage.textContent = 'Lütfen bir araç numarası girin.';
            searchMessage.style.color = 'orange';
            resetContentView();
            return;
        }

        // Kullanıcının girdisini normalleştir (tüm tireleri ve boşlukları kaldır, büyük harf yap)
        const normalizedSearchTerm = searchTerm.replace(/[- ]/g, '').toUpperCase();

        let foundItem = null;

        // allCatalogsData üzerinde özyinelemeli (recursive) arama fonksiyonu
        function searchInItems(items) {
            for (const item of items) {
                if (item.type === 'item') {
                    // Eğer item bir ürün (katalog) ise vehicle_numbers dizisini kontrol et
                    if (item.vehicle_numbers && Array.isArray(item.vehicle_numbers)) {
                        for (const vehicleNum of item.vehicle_numbers) {
                            // JSON'daki her bir araç numarasını normalleştir (tireleri ve boşlukları kaldır, büyük harf yap)
                            const normalizedJsonNum = String(vehicleNum).replace(/[- ]/g, '').toUpperCase();

                            // Normalize edilmiş değerleri karşılaştır
                            if (normalizedJsonNum === normalizedSearchTerm) {
                                foundItem = item;
                                return true; // Eşleşme bulundu, aramayı durdur
                            }
                        }
                    }
                } else if (item.type === 'category' && item.children) {
                    // Eğer item bir kategori ise çocuklarını ara
                    if (searchInItems(item.children)) {
                        return true; // Alt kategorilerde bulundu, aramayı durdur
                    }
                }
            }
            return false; // Bulunamadı
        }

        // Tüm katalog verisinde aramayı başlat
        searchInItems(allCatalogsData);

        if (foundItem) {
            searchMessage.textContent = `Bulundu: ${foundItem.name}`;
            searchMessage.style.color = 'green';

            // Arama sonucunda da her zaman yeni sekmede aç
            window.open(foundItem.source_path, '_blank');

            // Menüde ilgili öğeyi işaretle ve kategorilerini aç
            catalogTree.querySelectorAll('li a').forEach(a => a.classList.remove('current-active-pdf'));
            // Doğru linki source_path üzerinden bul
            const correspondingLink = Array.from(catalogTree.querySelectorAll('li a'))
                .find(link => link.dataset.sourcePath === foundItem.source_path);

            if (correspondingLink) {
                correspondingLink.classList.add('current-active-pdf');
                let parentUl = correspondingLink.closest('ul');
                // Üst menüleri açmak için döngü
                while (parentUl && parentUl.classList.contains('submenu') && parentUl.style.maxHeight === '0px') {
                    parentUl.style.maxHeight = parentUl.scrollHeight + 'px';
                    parentUl.parentElement.classList.add('active'); // Üst kategoriye 'active' sınıfı ekle
                    parentUl = parentUl.parentElement.closest('ul'); // Bir üst menüye geç
                }
            }
            // Yeni sekme açıldığı için içerik görünümünü başlangıca döndür
            resetContentView();

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
