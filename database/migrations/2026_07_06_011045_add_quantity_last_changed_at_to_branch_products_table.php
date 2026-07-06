<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('branch_products', function (Blueprint $table) {
            $table->timestamp('quantity_last_changed_at')->nullable()->after('quantity');
        });

        // Initialize existing rows
        DB::table('branch_products')->update([
            'quantity_last_changed_at' => DB::raw('updated_at')
        ]);

        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::unprepared("
                CREATE TRIGGER trg_branch_products_qty_ins
                BEFORE INSERT ON branch_products
                FOR EACH ROW
                BEGIN
                    IF NEW.quantity_last_changed_at IS NULL THEN
                        SET NEW.quantity_last_changed_at = NOW();
                    END IF;
                END
            ");

            DB::unprepared("
                CREATE TRIGGER trg_branch_products_qty_upd
                BEFORE UPDATE ON branch_products
                FOR EACH ROW
                BEGIN
                    IF OLD.quantity <> NEW.quantity THEN
                        SET NEW.quantity_last_changed_at = NOW();
                    END IF;
                END
            ");
        } elseif ($driver === 'sqlite') {
            DB::unprepared("
                CREATE TRIGGER trg_branch_products_qty_ins
                AFTER INSERT ON branch_products
                BEGIN
                    UPDATE branch_products 
                    SET quantity_last_changed_at = CURRENT_TIMESTAMP 
                    WHERE id = NEW.id;
                END
            ");

            DB::unprepared("
                CREATE TRIGGER trg_branch_products_qty_upd
                AFTER UPDATE OF quantity ON branch_products
                WHEN OLD.quantity <> NEW.quantity
                BEGIN
                    UPDATE branch_products 
                    SET quantity_last_changed_at = CURRENT_TIMESTAMP 
                    WHERE id = NEW.id;
                END
            ");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::unprepared("DROP TRIGGER IF EXISTS trg_branch_products_qty_ins");
            DB::unprepared("DROP TRIGGER IF EXISTS trg_branch_products_qty_upd");
        } elseif ($driver === 'sqlite') {
            DB::unprepared("DROP TRIGGER IF EXISTS trg_branch_products_qty_ins");
            DB::unprepared("DROP TRIGGER IF EXISTS trg_branch_products_qty_upd");
        }

        Schema::table('branch_products', function (Blueprint $table) {
            $table->dropColumn('quantity_last_changed_at');
        });
    }
};
