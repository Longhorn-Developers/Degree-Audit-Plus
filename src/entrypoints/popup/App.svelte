<script lang="ts">
  import Counter from '../../lib/Counter.svelte'
  import '~/assets/tailwind.css'

  function doThing() {
    browser.tabs.create({
      url: browser.runtime.getURL('/planner.html')
    })
  }
</script>

<main>
  <div>
  </div>
  <h1 class="text-red-400">Degree Audit Plus</h1>

  <div class="card">
    <Counter />
  </div>

  <p class="read-the-docs">
    Soon!
  </p>

  <button on:click={doThing}>click to plan</button>

</main>

<style>
  .read-the-docs {
    color: #888;
  }
</style>
