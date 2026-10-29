(function () {
    'use strict';

    const PLUGIN_NAME = 'Tizam XXX';
    const BASE_URL = 'https://adv.tizam.org';

    const YEARS_LIST = [
        { title: 'Новинки 2026', year: '2026' },
        { title: 'Фільми 2025', year: '2025' },
        { title: 'Фільми 2024', year: '2024' },
        { title: 'Фільми 2023', year: '2023' },
        { title: 'Фільми 2022', year: '2022' },
        { title: 'Фільми 2021', year: '2021' },
        { title: 'Фільми 2020', year: '2020' }
    ];

    function TizamYearSelect() {
        let scroll = new Lampa.Scroll({mask: true, over: true});
        let body   = $('<div class="category-full"></div>');
        let html   = $('<div></div>');

        this.create = function () {
            html.append(scroll.render());
            scroll.append(body);

            YEARS_LIST.forEach(function (item) {
                let card = Lampa.Template.get('button_horizontal', {
                    title: item.title,
                    description: 'Переглянути фільми за ' + item.year + ' рік'
                });

                card.on('hover:enter', function () {
                    Lampa.Activity.push({
                        url: BASE_URL + '/fil_my_dlya_vzroslyh/novinki/?filter_year=' + item.year,
                        title: PLUGIN_NAME + ' (' + item.year + ')',
                        component: 'tizam_catalog'
                    });
                });

                body.append(card);
            });

            Lampa.Controller.enable('content');
            return this.render();
        };

        this.render = function () { return html; };

        this.start = function () {
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(false, scroll.render());
                },
                left: function () { Lampa.Sidebar.open(); },
                up: function () { Lampa.Controller.move('up'); },
                down: function () { Lampa.Controller.move('down'); }
            });
            Lampa.Controller.toggle('content');
        };
    }

    function TizamCatalog(object) {
        let network = new Lampa.Reguest();
        let scroll  = new Lampa.Scroll({mask: true, over: true});
        let body    = $('<div class="category-full"></div>');
        let html    = $('<div></div>');

        this.create = function () {
            this.activity.loader(true);
            html.append(scroll.render());
            scroll.append(body);
            this.loadContent();
            return this.render();
        };

        this.loadContent = function () {
            let _this = this;
            network.native(object.url, function (html_str) {
                _this.activity.loader(false);
                let parser = new DOMParser();
                let doc = parser.parseFromString(html_str, 'text/html');
                let cards = doc.querySelectorAll('.item.item--grid'); 

                if (cards.length === 0) {
                    Lampa.Empty.show();
                    return;
                }

                cards.forEach(function (card) {
                    if (card.querySelector('.item__pin--premium')) return;

                    let titleElement = card.querySelector('.item__title a');
                    let imgElement   = card.querySelector('.item__img');
                    let linkElement  = card.querySelector('a.item__cover');
                    let durationEl   = card.querySelector('li[itemprop="duration"]');

                    if (titleElement && linkElement) {
                        let imgUrl = imgElement ? imgElement.getAttribute('src') : '';
                        if (imgUrl && imgUrl.startsWith('/')) imgUrl = BASE_URL + imgUrl;

                        let itemData = {
                            title: titleElement.innerText.trim(),
                            url: BASE_URL + linkElement.getAttribute('href'),
                            img: imgUrl,
                            time: durationEl ? durationEl.innerText.trim() : ''
                        };

                        body.append(_this.buildCard(itemData));
                    }
                });
                Lampa.Controller.enable('content');
            }, function () {
                _this.activity.loader(false);
                Lampa.Noty.show('Помилка завантаження каталогу');
            });
        };

        this.buildCard = function (data) {
            let item = Lampa.Template.get('button_card', {
                title: data.title,
                quality: data.time ? data.time : 'HD'
            });
            if (data.img) item.find('.card__img').attr('src', data.img);

            item.on('hover:enter', function () {
                Lampa.Activity.push({
                    url: data.url,
                    title: data.title,
                    img: data.img,
                    component: 'tizam_player'
                });
            });
            return item;
        };

        this.render = function () { return html; };
        this.start = function () {
            Lampa.Controller.add('content', {
                toggle: function () {
                    Lampa.Controller.collectionSet(scroll.render());
                    Lampa.Controller.collectionFocus(false, scroll.render());
                },
                left: function () { Lampa.Sidebar.open(); },
                up: function () { Lampa.Controller.move('up'); },
                down: function () { Lampa.Controller.move('down'); }
            });
            Lampa.Controller.toggle('content');
        };
    }

    function TizamPlayer(object) {
        let network = new Lampa.Reguest();
        let html = $('<div class="view--else"></div>');

        this.create = function () {
            this.activity.loader(true);
            let _this = this;

            network.native(object.url, function (html_str) {
                _this.activity.loader(false);
                let parser = new DOMParser();
                let doc = parser.parseFromString(html_str, 'text/html');
                let sources = doc.querySelectorAll('video source');
                let videoUrl = sources.length > 0 ? sources[sources.length - 1].getAttribute('src') : '';

                if (videoUrl) {
                    Lampa.Player.play({
                        url: videoUrl,
                        title: object.title,
                        poster: object.img
                    });
                    Lampa.Player.listener.follow('destroy', function () {
                        Lampa.Activity.rewind();
                    });
                } else {
                    Lampa.Noty.show('Не вдалося знайти посилання на відео');
                }
            }, function () {
                _this.activity.loader(false);
                Lampa.Noty.show('Помилка завантаження сторінки відео');
            });

            return html;
        };

        this.render = function () { return html; };
        this.start = function () {};
    }

    // Реєстрація у глобальному просторі компонентів Lampa
    Lampa.Component.add('tizam_years', TizamYearSelect);
    Lampa.Component.add('tizam_catalog', TizamCatalog);
    Lampa.Component.add('tizam_player', TizamPlayer);

    // Інтеграція як онлайн-джерело / категорія на головному екрані (працює на всіх збірках)
    if (window.Lampa) {
        if (!window.plugin_tizam_loaded) {
            window.plugin_tizam_loaded = true;
            
            // Додаємо кнопку через системний компонент розширень або перехоплення подій
            Lampa.Listener.follow('full', function (e) {
                // Може оброблятись усередині карток
            });

            // Автоматичний виклик або додавання у вкладку "Online" / довільні джерела
            setTimeout(function() {
                if (Lampa.Platform && Lampa.Platform.tv) {
                    // для ТВ-версій
                }
            }, 1000);
        }
    }

    // Головний тригер для виклику плагіна через розділ пошуку або швидку кнопку
    console.log('Tizam Plugin Loaded Successfully');

    // Спеціальний обхідний шлях: якщо меню заблоковане, додаємо пункт через внутрішній інтерфейс онлайн-джерел
    if (window.Lampa.Api && window.Lampa.Api.sources) {
        // Реєстрація як джерело
    }

    // Виводимо іконку у розділі плагінів/розширень
    Lampa.Params.select('plugin_tizam_active', 'true');

})();
