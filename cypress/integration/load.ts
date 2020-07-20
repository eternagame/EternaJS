describe('load representative puzzles', () => {
    it('does not crash on simple hairpin', () => {
        cy.visit('http://localhost:63343?puzzle=20111');
        // cy.visit('https://eternagame.org');
        expect(true).to.equal(true);
    });
});