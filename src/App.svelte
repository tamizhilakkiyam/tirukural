<script>
    import Kural from './Kural.svelte';
    import MiniKural from './MiniKural.svelte';

    const queries = new URLSearchParams(window.location.search);
    const withinKuralRange = x => x > 0 && x <= 1330;
    const englishLetterRegex = /^[A-Za-z]+$/;

    let loaded = [];
    let searchResults = null;
    let searchPageIndex = 1;
    let dailyKuralNumber = parseInt(localStorage.getItem('kural_aim') || '0');
    let searchQuery = queries.get('search');
    let requestedKural = parseInt(queries.get('kural'));
    
    requestedKural = isNaN(requestedKural) ? null : requestedKural;

    String.prototype.toProperCase = function () {
        return this.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    };

    function parseSearchQuery (query) {
        if (!query?.length) return;

        let intParsed = parseInt(query);
        if (!isNaN(intParsed)) return requestedKural = intParsed;
        requestedKural = null;

        if (query.length < 5) 
            return alert("வினவல் குறைந்தது 5 எழுத்துகள் நீளமாக இருக்க வேண்டும். Query must be atleast 5 characters long.");

        let results = [];
        searchQuery = query;

        if (query.replace(' ', '').match(englishLetterRegex)) {
            query = query.toProperCase();
            for (let i = 0; i < loaded.length; i++) {
                let kural = loaded[i];
                if (kural.tlr.includes(query)) results.push({ kural, i });
            }
        } else 
            for (let i = 0; i < loaded.length; i++) {
                let kural = loaded[i];
                if (kural.li.includes(query)) results.push({ kural, i });
            }

        return searchResults = results;
    }

    function updateDailyKuralNumber (x) {
        if (!withinKuralRange(dailyKuralNumber)) return;
        dailyKuralNumber = dailyKuralNumber + x;
        localStorage.setItem('kural_aim', dailyKuralNumber);
    }

    function resetConfig () {
        requestedKural = null;
        searchResults = [];
        searchPageIndex = 1;
        searchQuery = null;
        window.location.search = "";
    }

    function showKuralByNumber (n) {
        requestedKural = n;
        searchResults = [];
        searchPageIndex = 1;
        searchQuery = null;
        window.location.search = "";
    }

    function updateSearchPageIndex (x) {
        if (searchResults?.length) {
            let newIndex = searchPageIndex + x;
            if (Math.ceil(searchResults.length / 10) < newIndex) searchPageIndex = 1;
            else if (newIndex <= 0) searchPageIndex = Math.ceil(searchResults.length / 10);
            else searchPageIndex = newIndex;
        }
    }

    fetch('/tirukkural.json')
        .then(res => res.json())
        .then(body => {
            loaded = body;
            parseSearchQuery(searchQuery);
        });
</script>

<div class="cover">
    <h1>திருக்குறள்</h1>
    <p>உலக பொதுமறை, பொய்யாமொழி, தெய்வநூல் என பொற்றபடும் திருக்குறளை கற்றுக்கொள்ளுங்கள்</p>
    <input placeholder="திருக்குறளைத் தேடுங்கள்" id="search" on:keydown={e => {
        if (e.key == "Enter")
            parseSearchQuery(document.getElementById('search').value)
    }}>
</div>

<div class="content">
    {#if loaded.length == 0}
        <p class="tamil">சிறிது நேரம் காத்திருக்கவும்...</p>
    {:else}

        {#if withinKuralRange(requestedKural)}
            <div class="kural-box">
                <Kural 
                    kural={loaded[requestedKural - 1]} 
                    kuralEnn={requestedKural - 1}
                />
            </div>

            <div class="kural-box">
                <!-- svelte-ignore a11y-missing-attribute -->
                <a on:click={() => resetConfig()} class="bth-link">
                    <p class="tamil">முகப்புப் பக்கத்திற்குச் செல்ல வேண்டுமா?</p>
                    <p class="english"> Back to Homepage?</p>
                </a>
            </div>
        {:else if requestedKural}
            <div class="kural-box">
                <div class="tamil">குறள் எண் {requestedKural} திருக்குறளில் இல்லை</div>

                <!-- svelte-ignore a11y-missing-attribute -->
                <a on:click={() => resetConfig()} class="bth-link">
                    <p class="tamil">முகப்புப் பக்கத்திற்குச் செல்ல வேண்டுமா?</p>
                    <p class="english"> Back to Homepage?</p>
                </a>
            </div>
        {:else if searchResults}
            {#each searchResults.slice((searchPageIndex - 1) * 6, searchPageIndex * 6) as result}
                <div class="kural-box">
                    <MiniKural result={result}/>
                    <!-- svelte-ignore a11y-missing-attribute -->
                    <a class="kural-button" on:click={() => showKuralByNumber(result.i + 1)}>மேலும் படிக்க</a>
                </div>
            {/each}

            {#if searchResults.length == 0}
                <div class="kural-box">
                    <div class="tamil">"{searchQuery}" என்னும் குறளை கண்டுபிடிக்க முடியவில்லை...</div>
                </div>
            {:else}
                <br/>
                <!-- svelte-ignore a11y-missing-attribute -->
                <a class="kural-button" on:click={() => updateSearchPageIndex(-1)}>முந்தைய குறட்கள்</a>
                <!-- svelte-ignore a11y-missing-attribute -->
                <a class="kural-button" on:click={() => updateSearchPageIndex(1)}>அடுத்த குறட்கள்</a>
            {/if}

            <div class="kural-box">
                <!-- svelte-ignore a11y-missing-attribute -->
                <a on:click={() => resetConfig()} class="bth-link">
                    <p class="tamil">முகப்புப் பக்கத்திற்குச் செல்ல வேண்டுமா?</p>
                    <p class="english"> Back to Homepage?</p>
                </a>
            </div>
        {:else}
            <div class="kural-box">
                <Kural 
                    kural={loaded[dailyKuralNumber]} 
                    kuralEnn={dailyKuralNumber}
                />

                <!-- svelte-ignore a11y-missing-attribute -->
                <a class="kural-button" on:click={() => updateDailyKuralNumber(-1)}>முந்தைய குறள்</a>
                <!-- svelte-ignore a11y-missing-attribute -->
                <a class="kural-button" on:click={() => updateDailyKuralNumber(1)}>அடுத்த குறள்</a>
            </div>
        {/if}
    {/if}
</div>