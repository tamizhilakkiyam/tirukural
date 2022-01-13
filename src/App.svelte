<script>
    import Kural from './Kural.svelte';
    import MiniKural from './MiniKural.svelte';
    import Index from './Index.svelte';
    import Footer from './Footer.svelte';

    const queries = new URLSearchParams(window.location.search);
    const withinKuralRange = x => x > 0 && x <= 1330;
    const englishLetterRegex = /^[A-Za-z]+$/;

    let loaded = [];
    let searchResults = null;
    let searchPageIndex = 1;
    let mainKuralNumber = parseInt(localStorage.getItem('kural_no') || '0');
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

        let results = [];
        searchQuery = query;

        if (query.replace(' ', '').match(englishLetterRegex)) {
            if (query.length < 5) 
                return alert("Query must be atleast 5 characters long for search in english to prevent website crash.");

            query = query.toProperCase();
            for (let i = 0; i < loaded.length; i++) {
                let kural = loaded[i];
                if (kural.tlr.includes(query)) results.push({ kural, i });
            }
        } else 
            if (query.length < 3) 
                alert("இணையதள செயலிழப்பை தடுக்க வினவல் குறைந்தது 5 எழுத்துகள் நீளமாக இருக்க வேண்டும்.")

            for (let i = 0; i < loaded.length; i++) {
                let kural = loaded[i];
                if (kural.li.includes(query)) results.push({ kural, i });
            }

        return searchResults = results;
    }

    function updateMainKuralNumber (x, isIndex) {
        console.log(mainKuralNumber)
        if (isIndex) {
            if (!withinKuralRange(x + 1)) return;
            mainKuralNumber = x;
        } else {
            if (!withinKuralRange(mainKuralNumber + 1)) return;
            mainKuralNumber = mainKuralNumber + x;
        }

        localStorage.setItem('kural_no', mainKuralNumber);
    }

    function resetConfig (n = null) {
        requestedKural = n;
        searchResults = null;
        searchPageIndex = 1;
        searchQuery = null;
    }

    function updateSearchPageIndex (x) {
        if (searchResults?.length) {
            let newIndex = searchPageIndex + x;
            if (Math.ceil(searchResults.length / 10) < newIndex) searchPageIndex = 1;
            else if (newIndex <= 0) searchPageIndex = Math.ceil(searchResults.length / 10);
            else searchPageIndex = newIndex;
        }
    }

    fetch(`${window.location.href}/tirukkural.json`)
        .then(res => res.json())
        .then(body => {
            loaded = body;
            parseSearchQuery(searchQuery);
        });
</script>

<div class="cover">
    <h1>திருக்குறள்</h1>
    <p>திருவள்ளுவரின் திருக்குறள் / Tiruvalluvar's Tirukkural</p>

    <input placeholder="திருக்குறளைத் தேடுங்கள் / Search Tirukkural" id="search" on:keydown={e => {
        if (e.key == "Enter")
            parseSearchQuery(document.getElementById('search').value)
    }}>

    <p style="margin-top: 5px;">தேட enter-ஐ அழுத்தவும் / Press enter to search.</p>
</div>

<div class="content" id="content">
    {#if loaded.length == 0}
        <p class="tamil">சிறிது நேரம் காத்திருக்கவும்...</p>
        <p class="english">Please wait for some time...</p>
    {:else}
        {#if withinKuralRange(requestedKural)}
            <div class="kural-box">
                <Kural 
                    kural={loaded[requestedKural - 1]} 
                    kuralEnn={requestedKural}
                />

                <!-- svelte-ignore a11y-missing-attribute -->
                <a 
                    class="kural-button" 
                    style="min-width: calc(100% - 20px)"
                    on:click={() => {
                        updateMainKuralNumber(requestedKural - 1, true);
                        resetConfig();
                    }}
                >இக்குறளை முகப்புப்பக்கத்தில் அமைக்க / Set this kural at homepage</a>
            </div>

            <div class="kural-box">
                <!-- svelte-ignore a11y-missing-attribute -->
                <a on:click={() => resetConfig()} class="bth-link">
                    <p class="tamil">முகப்புப் பக்கத்திற்குச் செல்ல வேண்டுமா? Back to Homepage?</p>
                </a>
            </div>
        {:else if requestedKural}
            <div class="kural-box">
                <div class="tamil">குறள் எண் {requestedKural} திருக்குறளில் இல்லை</div>
                <div class="english">Kural number {requestedKural} does not exists in Tirukkural.</div>

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
                    <a class="kural-button" on:click={() => resetConfig(result.i + 1)}>மேலும் படிக்க / Read More</a>
                </div>
            {/each}

            {#if searchResults.length == 0}
                <div class="kural-box">
                    <div class="tamil">"{searchQuery}" என்னும் குறளை கண்டுபிடிக்க முடியவில்லை...</div>
                    <div class="english">Cannot find results for "{searchQuery}"...</div>
                </div>
            {:else}
                <br/>
                <!-- svelte-ignore a11y-missing-attribute -->
                <a class="kural-button" on:click={() => updateSearchPageIndex(-1)}>முந்தைய பக்கம் / Previous Page</a>
                <!-- svelte-ignore a11y-missing-attribute -->
                <a class="kural-button" on:click={() => updateSearchPageIndex(1)}>அடுத்த பக்கம் / Next Page</a>

                <h3 class="tamil bold">Page / பக்கம் {searchPageIndex}/{Math.ceil(searchResults.length / 10)}</h3>
            {/if}

            <div class="kural-box">
                <!-- svelte-ignore a11y-missing-attribute -->
                <a on:click={() => resetConfig()} class="bth-link">
                    <p class="tamil">முகப்புப் பக்கத்திற்குச் செல்ல வேண்டுமா? Back to Homepage?</p>
                </a>
            </div>
        {:else}
            <div class="kural-box">
                <Kural 
                    kural={loaded[mainKuralNumber]} 
                    kuralEnn={mainKuralNumber + 1}
                />

                <!-- svelte-ignore a11y-missing-attribute -->
                <a class="kural-button" on:click={() => updateMainKuralNumber(-1)}>முந்தைய குறள் / Previous Kural</a>
                <!-- svelte-ignore a11y-missing-attribute -->
                <a class="kural-button" on:click={() => updateMainKuralNumber(1)}>அடுத்த குறள் / Next Kural</a>
            </div>

            <div class="kural-box">
                <Index on:request={({ detail }) => {
                    updateMainKuralNumber(detail.start - 1, true);
                    document.getElementById('content').scrollIntoView()
                }}/>
            </div>
        {/if}
    {/if}
</div>

<Footer/>